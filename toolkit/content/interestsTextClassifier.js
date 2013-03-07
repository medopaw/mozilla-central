/* -*- Mode: javascript; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * vim: sw=2 ts=2 sts=2 expandtab
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const kNotWordPattern = /[^a-z0-9 ]+/g;
const kMinimumMatchTokens = 3;

function PlaceTokenizer(aUrlStopwordSet) {
  this._urlStopwordSet = aUrlStopwordSet;
}

PlaceTokenizer.prototype = {
  tokenize: function(aUrl, aTitle) {
    let aUrl = aUrl.toLowerCase().replace(kNotWordPattern, " ");
    let aTitle = aTitle.toLowerCase().replace(kNotWordPattern, " ");

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

    if (tokenMatchCount > kMinimumMatchTokens) {
      let max_index = posteriors.indexOf(Math.max.apply(Math, posteriors));
      return this._classes[max_index];
    }
    return null;
  }
}
