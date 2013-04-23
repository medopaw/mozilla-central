/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kNotWordPattern = /[^a-z0-9 ]+/g;
const kMinimumMatchTokens = 3;
const kSimilarityCutOff = 0.95;

function PlaceTokenizer(aUrlStopwordSet) {
  this._urlStopwordSet = aUrlStopwordSet;
}

PlaceTokenizer.prototype = {
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

    tokens = tokens.concat(aTitle.split(/\s+/));

    return tokens;
  }
}

function NaiveBayesClassifier(aModel) {
  this._classes = aModel.classes;
  this._likelihoods = aModel.likelihoods;
  this._priors = aModel.priors;
}

NaiveBayesClassifier.prototype = {
  classify: function(aTokens) {
    if (!Array.isArray(aTokens)) {
      throw new TypeError("invalid input data");
    }

    let posteriors = [];
    this._priors.forEach(function(){
      posteriors.push(0);
    }, this);

    let tokenMatchCount = 0;
    aTokens.forEach(function(token){
      if (this._likelihoods.hasOwnProperty(token)) {
        tokenMatchCount += 1;
        posteriors.forEach(function(value, index) {
          if (posteriors[index] == 0) {
            posteriors[index] = this._priors[index];
          }
          posteriors[index] *= this._likelihoods[token][index];
        }, this);
      }
    }, this); 

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
        } else if (currentMax/maxValue >= kSimilarityCutOff) {
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
