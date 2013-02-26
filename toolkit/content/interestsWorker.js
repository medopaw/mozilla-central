/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

importScripts("interestsData.js");

// Dispatch the message to the appropriate function
self.onmessage = function({data}) {
  self[data.message](data);
};

// Figure out which interests are associated to the document
function getInterestsForDocument({host, language, tld, metaData, path, title, url}) {
  let interests = [];
  let hostKeys = (interestsData[host]) ? Object.keys(interestsData[host]).length : 0;
  let tldKeys = (host != tld && interestsData[tld]) ? Object.keys(interestsData[tld]).length : 0;

  if (hostKeys || tldKeys) {
    // process __HOST first
    if (hostKeys && interestsData[host]["__HOST"]) {
      interests = interests.concat(interestsData[host]["__HOST"]);
      hostKeys--;
    }
    if (tldKeys && interestsData[tld]) {
      interests = interests.concat(interestsData[tld]["__HOST"]);
      tldKeys--;
    }

    // process keywords
    if (hostKeys || tldKeys) {
      // Split on non-dash, alphanumeric, latin-small, greek, cyrillic
      const splitter = /[^-\w\xco-\u017f\u0380-\u03ff\u0400-\u04ff]+/;
      let words = (url + " " + title).toLowerCase().split(splitter);

      function matchedAllTokens(tokens) {
        return tokens.every(function(word) {
          return words.indexOf(word) != -1;
        });
      }

      function processDFRKeys(hostObject) {
        Object.keys(hostObject).forEach(function(key) {
          if (key != "__HOST" && matchedAllTokens(key.split(splitter))) {
            interests = interests.concat(hostObject[key]);
          }
        });
      }

      if (hostKeys) processDFRKeys(interestsData[host]);
      if (tldKeys) processDFRKeys(interestsData[tld]);
    }
  }
  // Respond with the interests for the document
  self.postMessage({
    host: host,
    interests: interests,
    message: "InterestsForDocument",
    url: url
  });
}
