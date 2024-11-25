// background.js
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: "pages/manager.html",
  });
});

// Function to get manifest data
function getManifestData() {
  const manifest = chrome.runtime.getManifest();
  return {
    clientId: manifest.oauth2?.client_id,
    scopes: manifest.oauth2?.scopes,
  };
}

// Message listener
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getGoogleAccount") {
    handleGoogleAccountRequest(sendResponse);
    return true;
  }
  if (request.action === "addGoogleAccount") {
    handleAddGoogleAccount().then(sendResponse);
    return true;
  }
  if (request.action === "getAccessToken") {
    handleAccessTokenRequest(request.email, sendResponse);
    return true;
  }
  return false;
});

// Separate function to handle the request
async function handleGoogleAccountRequest(sendResponse) {
  try {
    const accountInfo = await getGoogleAccountInfo();
    sendResponse({ success: true, account: accountInfo });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Modified getGoogleAccountInfo function
async function getGoogleAccountInfo() {
  const { clientId, scopes } = getManifestData();

  if (!clientId || !scopes) {
    throw new Error("OAuth2 configuration missing in manifest");
  }

  const token = await new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: true, scopes }, (token) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      resolve(token);
    });
  });

  const response = await fetch(
    "https://www.googleapis.com/oauth2/v2/userinfo",
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch user info: ${response.statusText}`);
  }

  const userInfo = await response.json();
  return {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
  };
}

// Add this to your existing background.js
async function handleAddGoogleAccount() {
  try {
    const manifest = chrome.runtime.getManifest();
    const scopes = manifest.oauth2.scopes;

    // First remove cached tokens
    await new Promise((resolve, reject) => {
      chrome.identity.clearAllCachedAuthTokens(() => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });

    // Then get new token with account picker
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken(
        {
          interactive: true,
          scopes: scopes,
          // Force account picker to show
          account: null,
        },
        (token) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
            return;
          }
          resolve(token);
        }
      );
    });

    // Revoke and remove the token to ensure fresh login next time
    await new Promise((resolve, reject) => {
      chrome.identity.removeCachedAuthToken({ token: token }, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve();
      });
    });

    const response = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to get user info");
    }

    const userInfo = await response.json();
    return {
      success: true,
      account: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.name || userInfo.email.split("@")[0],
        picture: userInfo.picture,
      },
    };
  } catch (error) {
    console.error("Add account error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Separate function to handle the token request
async function handleAccessTokenRequest(email, sendResponse) {
  try {
    const token = await getAccessToken(email);
    sendResponse({ success: true, token });
  } catch (error) {
    sendResponse({ success: false, error: error.message });
  }
}

// Get access token function
async function getAccessToken(email) {
  const { clientId, scopes } = getManifestData();

  if (!clientId || !scopes) {
    throw new Error("OAuth2 configuration missing in manifest");
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive: false,
        account: email,
        scopes,
      },
      (token) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
          return;
        }
        resolve(token);
      }
    );
  });
}
