/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

importScripts("interestsData.js");

// Dispatch the message to the appropriate function
self.onmessage = function({data}) {
  self[data.message](data);
};

// Figure out which interests are associated to the document
function getInterestsForDocument({host, language, metaData, path, title, url}) {
  // Use the simple interests if available
  let interests = interestsData.simple[host];
  if (interests == null) {
    let interestMap = {};

    // Try matching the path for each complex pattern
    let patterns = interestsData.complex[host] || [];
    patterns.forEach(function([pattern, cats]) {
      let matched;
      // Match as a regex pattern
      if (pattern.indexOf("*") != -1) {
        matched = path.match(pattern);
      }
      // Match as a path prefix
      else if (pattern.slice(-1) == "/") {
        matched = path.indexOf(pattern) == 0;
      }
      // Do an exact match
      else {
        matched = path == pattern;
      }

      // Remember the associated interest for the path
      if (matched) {
        cats.forEach(function(cat) {
          interestMap[cat] = true;
        });
      }
    });

    // Generate the array of interests
    interests = Object.keys(interestMap);
  }

  // Respond with the interests for the document
  self.postMessage({
    host: host,
    interests: interests,
    message: "InterestsForDocument",
    url: url
  });
}
