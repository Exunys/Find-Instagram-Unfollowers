(() => {
  if (window.location.origin !== "https://www.instagram.com") {
    window.alert(
      "Hey! You need to be on the instagram site before you run the code. I'm taking you there now but you're going to have to run the code into the console again.",
    );
    window.location.href = "https://www.instagram.com";
    console.clear();
    return;
  }

  const getCookie = (name) => {
    const match = document.cookie.match(new RegExp('(^|;)\\s*' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };

  const getCsrfToken = () => getCookie("csrftoken");
  
  // Extract your logged-in user ID directly from your session cookies
  const getCurrentUserId = () => getCookie("ds_user_id");

  const fetchOptions = {
    credentials: "include",
    headers: {
      "X-IG-App-ID": "936619743392459",
      "X-CSRFToken": getCsrfToken(),
      "X-Requested-With": "XMLHttpRequest",
    },
    method: "GET",
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const random = (min, max) => Math.ceil(Math.random() * (max - min)) + min;

  const concatFriendshipsApiResponse = async (
    list,
    user_id,
    count,
    next_max_id = "",
  ) => {
    let url = `https://www.instagram.com/api/v1/friendships/${user_id}/${list}/?count=${count}`;
    if (next_max_id) {
      url += `&max_id=${next_max_id}`;
    }

    const response = await fetch(url, fetchOptions);
    if (!response.ok) {
      throw new Error(`Failed to fetch ${list}: HTTP error status ${response.status}. You may be rate-limited.`);
    }

    const data = await response.json();

    if (!data.users) {
      return [];
    }

    if (data.next_max_id) {
      const timeToSleep = random(300, 800);
      console.log(
        `Loaded ${data.users.length} ${list}. Sleeping ${timeToSleep}ms to avoid rate limiting...`,
      );

      await sleep(timeToSleep);
      const nextUsers = await concatFriendshipsApiResponse(
        list,
        user_id,
        count,
        data.next_max_id,
      );
      return data.users.concat(nextUsers);
    }

    return data.users;
  };

  const getFollowers = (user_id, count = 50, next_max_id = "") => {
    return concatFriendshipsApiResponse("followers", user_id, count, next_max_id);
  };

  const getFollowing = (user_id, count = 50, next_max_id = "") => {
    return concatFriendshipsApiResponse("following", user_id, count, next_max_id);
  };

  const getUserFriendshipStats = async () => {
    const user_id = getCurrentUserId();

    if (!user_id) {
      throw new Error("Could not find 'ds_user_id' cookie. Make sure you are logged into Instagram.");
    }

    console.log(`Using logged-in User ID: ${user_id}. Fetching followers and following...`);

    const followers = await getFollowers(user_id);
    const following = await getFollowing(user_id);

    const followerSet = new Set(followers.map(f => f.username.toLowerCase()));
    const followingSet = new Set(following.map(f => f.username.toLowerCase()));

    console.log(Array(28).fill("-").join(""));
    console.log(
      `Fetched`,
      followerSet.size,
      "followers and",
      followingSet.size,
      "following.",
    );

    const PeopleIDontFollowBack = Array.from(followerSet).filter(
      (follower) => !followingSet.has(follower),
    );

    const PeopleNotFollowingMeBack = Array.from(followingSet).filter(
      (following) => !followerSet.has(following),
    );

    return {
      PeopleIDontFollowBack,
      PeopleNotFollowingMeBack,
    };
  };

  getUserFriendshipStats()
    .then((res) => {
      console.log("Analysis Complete:");
      console.log(res);
    })
    .catch((err) => console.error("Error running script:", err));
})();
