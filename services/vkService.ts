
import { VKPost } from "../types";

const API_VERSION = '5.131';

// JSONP Helper to bypass CORS
const jsonp = (url: string, callbackParam: string = 'callback'): Promise<any> => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    const callbackName = 'vk_jsonp_' + Math.round(100000 * Math.random());
    
    // Define global callback
    (window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName];
      document.body.removeChild(script);
      if (data.error) {
        reject(new Error(data.error.error_msg || 'Unknown VK API Error'));
      } else {
        resolve(data.response);
      }
    };

    script.src = `${url}&${callbackParam}=${callbackName}`;
    script.onerror = () => {
      delete (window as any)[callbackName];
      document.body.removeChild(script);
      reject(new Error('JSONP Request Failed'));
    };
    
    document.body.appendChild(script);
  });
};

export const resolveCommunityId = async (input: string, token: string): Promise<{ id: number; name: string; photo: string }> => {
  // Extract screen name from URL or input
  let screenName = input;
  
  // Handle full URLs like https://vk.com/durov or vk.com/public12345
  try {
    const urlObj = new URL(input.startsWith('http') ? input : `https://${input}`);
    if (urlObj.hostname.includes('vk.com')) {
      screenName = urlObj.pathname.replace('/', '');
    }
  } catch (e) {
    // Input is likely just the screen name or ID
    screenName = input.replace('vk.com/', '').replace('/', '');
  }

  // Handle empty path
  if (!screenName) throw new Error('Invalid community URL');

  // API Call to utils.resolveScreenName
  const params = new URLSearchParams({
    screen_name: screenName,
    access_token: token,
    v: API_VERSION
  });

  const resolved = await jsonp(`https://api.vk.com/method/utils.resolveScreenName?${params.toString()}`);
  
  // If we can't resolve it (array is empty or null)
  if (!resolved || (Array.isArray(resolved) && resolved.length === 0)) {
    throw new Error('Community not found. Check the URL.');
  }

  // Determine owner_id
  // object_id is always positive in resolveScreenName.
  // if type is 'group' or 'page', we need negative ID for wall methods.
  let ownerId = resolved.object_id;
  if (resolved.type === 'group' || resolved.type === 'page') {
    ownerId = -resolved.object_id;
  }

  // Now get details (name, photo)
  // If ownerId is negative, it's a group.
  const isGroup = ownerId < 0;
  const detailsMethod = isGroup ? 'groups.getById' : 'users.get';
  const idParam = isGroup ? 'group_id' : 'user_ids';
  const absId = Math.abs(ownerId);

  const detailsParams = new URLSearchParams({
    [idParam]: absId.toString(),
    fields: 'photo_200',
    access_token: token,
    v: API_VERSION
  });

  const detailsData = await jsonp(`https://api.vk.com/method/${detailsMethod}?${detailsParams.toString()}`);
  
  if (!detailsData || detailsData.length === 0) {
    throw new Error('Could not fetch community details.');
  }

  const info = detailsData[0];

  return {
    id: ownerId,
    name: isGroup ? info.name : `${info.first_name} ${info.last_name}`,
    photo: info.photo_200 || ''
  };
};

export const fetchPosts = async (
  ownerId: number,
  startDate: string,
  endDate: string,
  token: string
): Promise<VKPost[]> => {
  const startTs = Math.floor(new Date(startDate).getTime() / 1000);
  // End date should be end of that day
  const endTs = Math.floor(new Date(endDate).getTime() / 1000) + 86400;

  let allPosts: any[] = [];
  let offset = 0;
  const count = 100; // Max allowed by VK
  let shouldFetch = true;
  let requests = 0;
  const MAX_REQUESTS = 20; // Safety limit (2000 posts max)

  while (shouldFetch && requests < MAX_REQUESTS) {
    const params = new URLSearchParams({
      owner_id: ownerId.toString(),
      offset: offset.toString(),
      count: count.toString(),
      access_token: token,
      v: API_VERSION
    });

    const response = await jsonp(`https://api.vk.com/method/wall.get?${params.toString()}`);
    const items = response.items || [];

    if (items.length === 0) {
      break;
    }

    for (const item of items) {
      // Check date
      if (item.date < startTs) {
        shouldFetch = false;
        // Don't break immediately if pinned, but pinned usually comes first.
        if (!item.is_pinned) {
           break; 
        }
      }

      if (item.date >= startTs && item.date <= endTs) {
        allPosts.push(item);
      }
    }

    offset += count;
    requests++;
    
    // If the last item in this batch is already older than start date, we stop
    const lastItem = items[items.length - 1];
    if (lastItem.date < startTs && !lastItem.is_pinned) {
      shouldFetch = false;
    }
    
    // Small delay to be nice to API
    await new Promise(r => setTimeout(r, 200));
  }

  // --- Filtering Logic ---
  const cleanedPosts = allPosts.filter(post => {
    // 1. Exclude explicit 'link' attachments (external website cards)
    const hasLinkAttachment = post.attachments?.some((a: any) => a.type === 'link');
    if (hasLinkAttachment) return false;

    // 2. Check text for links and mentions
    const text = post.text || '';

    // Regex for standard URLs (http/https)
    if (/https?:\/\//i.test(text)) return false;

    // Regex for VK mentions (e.g., [club123|Name] or [id123|Name])
    // These are often used for cross-promotion or ads
    if (/\[(club|public|id)\d+\|/i.test(text)) return false;

    // Regex for raw vk.com links
    if (/vk\.com\//i.test(text)) return false;

    return true;
  });

  // Transform to VKPost
  return cleanedPosts.map(post => {
    // Find best image
    const attachments = post.attachments || [];
    let imageUrl = '';
    const photoAttachment = attachments.find((a: any) => a.type === 'photo');
    if (photoAttachment) {
        // Get largest size
        const sizes = photoAttachment.photo.sizes;
        imageUrl = sizes[sizes.length - 1].url;
    }

    return {
      id: `${post.owner_id}_${post.id}`,
      text: post.text,
      likes: post.likes?.count || 0,
      comments: post.comments?.count || 0,
      reposts: post.reposts?.count || 0,
      date: new Date(post.date * 1000).toLocaleDateString(),
      timestamp: post.date,
      url: `https://vk.com/wall${post.owner_id}_${post.id}`,
      imageUrl
    };
  });
};
