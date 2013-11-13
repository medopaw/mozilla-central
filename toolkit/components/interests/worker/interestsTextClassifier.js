/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kNotWordPattern = /[^a-z0-9 ]+/g;
const kMinimumMatchTokens = 3;
const kSimilarityCutOff = Math.log(0.95);

function PlaceTokenizer(aUrlStopwordSet, aBasicWordSet) {
  this._urlStopwordSet = aUrlStopwordSet;

  let wordHash = [];
  aBasicWordSet.forEach(function(word) {
    var n = word.length;
    if (!wordHash[n]) {
        wordHash[n] = {};
    }
    wordHash[n][word] = true;
  });
  this._wordHash = wordHash;
}

PlaceTokenizer.prototype = {
  _identifyWords: function(aStr) {
    let wordHash = this._wordHash;

    let segment = function(aStr) {
      let maxLen = Math.min(aStr.length, wordHash.length - 1);
      for (let n = maxLen; n > 0; n--) {
        if (!wordHash[n]) {
          continue;
        }
        let section = aStr.slice(aStr.length - n);
        if (wordHash[n][section]) {
          return aStr.length >= n
            ? segment(aStr.slice(0, aStr.length - n)).concat([section])
            : [];
        }
      }
      return aStr.length >= 1
        ? segment(aStr.slice(0, aStr.length - 1))
        : [];
    }

    return segment(aStr);
  },

  tokenize: function(aUrl, aTitle) {
    aUrl = aUrl.toLowerCase().replace(kNotWordPattern, " ");
    aTitle = (aTitle) ? aTitle.toLowerCase().replace(kNotWordPattern, " ") : "";

    let tokens = [];

    let urlTokens = aUrl.split(/\s+/);
    urlTokens.forEach(function(token) {
      if (!(this._urlStopwordSet.hasOwnProperty(token))) {
        tokens.push(token);
      }
    }, this);

    tokens = tokens.concat(this._identifyWords(aTitle));

    return tokens;
  }
}

function NaiveBayesClassifier(aModel) {
  this._classes = aModel.classes;
  this._logLikelihoods = aModel.logLikelihoods;
  this._logPriors = aModel.logPriors;
}

NaiveBayesClassifier.prototype = {
  classify: function(aTokens) {
    if (!Array.isArray(aTokens)) {
      throw new TypeError("invalid input data");
    }

    let posteriors = [];

    for (var index=0; index < this._logPriors.length; index++) {
      posteriors.push(this._logPriors[index]);
    }

    let tokenMatchCount = 0;
    for (let tokenIndex=0; tokenIndex < aTokens.length; tokenIndex++) {
      let token = aTokens[tokenIndex];
      if (this._logLikelihoods.hasOwnProperty(token)) {
        tokenMatchCount += 1;
        for (var index=0; index < posteriors.length; index++) {
          posteriors[index] += this._logLikelihoods[token][index];
        }
      }
    }

    let classMatches = [];
    if (tokenMatchCount > kMinimumMatchTokens) {
      let maxValue = -Infinity;

      while(true) {
        let currentMax = Math.max.apply(Math, posteriors);
        let max_index;
        if (currentMax > maxValue) {
          // set max value, setup to get next biggest probability
          max_index = posteriors.indexOf(currentMax);
          maxValue = currentMax;
          classMatches.push(this._classes[max_index]);
          posteriors[max_index] = -Infinity;
        } else if ((currentMax-maxValue) >= kSimilarityCutOff) {
          max_index = posteriors.indexOf(currentMax);
          classMatches.push(this._classes[max_index]);
          posteriors[max_index] = -Infinity;
        } else {
          // selection is done, the next nearest item is less similar than the threshold
          break;
        }
      }
      return classMatches;
    }
    return null;
  }
}
