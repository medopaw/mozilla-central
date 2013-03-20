/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = [
  "PlacesInterestsStorage"
]

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils", "resource://gre/modules/PlacesUtils.jsm");

const MS_PER_DAY = 86400000;

function genSQLParamList(someArray) {
  let paramStr = "";
  for(let index = 1; index <= someArray.length; index++) {
    paramStr += "?" + index;
    if (index < someArray.length) {
      paramStr += ",";
    }
  }
  return paramStr
}

function AsyncPromiseHandler(deferred, rowCallback) {
  this.deferred = deferred;
  this.rowCallback = rowCallback;
  this.resultSet = undefined;
};

AsyncPromiseHandler.prototype = {
  addToResultSet: function(value) {
    if (!this.resultSet) {
      this.resultSet = [];
    }
    this.resultSet.push(value);
  },
  handleError: function (error) {
    this.deferred.reject(error);
  },
  handleResult: function (result) {
    if (this.rowCallback) {
      let row = undefined;
      while (row = result.getNextRow()) {
        this.rowCallback(row);
      }
    }
  },
  handleCompletion: function (reason) {
    switch (reason) {
      case Ci.mozIStorageStatementCallback.REASON_FINISHED:
        this.deferred.resolve(this.resultSet);
        break;

      case Ci.mozIStorageStatementCallback.REASON_CANCELLED:
        this.deferred.reject(new Error("statement cancelled"));
        break;

      case Ci.mozIStorageStatementCallback.REASON_ERROR:
        this.deferred.reject(new Error("execution errors"));
        break;

      default:
        this.deferred.reject(new Error("unknown completion reason"));
        break;
    }
  }
};

let PlacesInterestsStorage = {
  /**
   * Convert a date to the UTC midnight for the date
   *
   * @param   [optional] time
   *          Reference date/time to round defaulting to today
   * @returns Numeric value corresponding to the date's UTC 00:00:00.000
   */
  _getRoundedTime: function(time) {
    // Default to now if no time is provided
    time = time || Date.now();
    // Round to the closest day
    return time - time % MS_PER_DAY;
  },

  addInterest: function (aInterest) {
    let returnDeferred = Promise.defer();
    let stmt = this.db.createAsyncStatement(
      "INSERT OR IGNORE INTO moz_up_interests (interest) VALUES(:interest)");
    stmt.params.interest = aInterest;
    stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
    stmt.finalize();
    return returnDeferred.promise;
  },

  /**
   * Increments the number of visits for an interest for a day
   * @param   aInterest
   *          The interest string
   * @param   {aVisitTime, aVisitCount}
   *          An object with the option names as keys
   *          aVisitTime: Date/time to associate with the visit, defaulting to today
   *          aVisitCount: The number of counts to add, defaulting to 1
   * @returns Promise for when the interest's visit is added
   */
  addInterestVisit: function(interest, optional={}){ 
    let {visitTime, visitCount} = optional;
    visitCount = visitCount || 1;

    let deferred = Promise.defer();
    // Increment or initialize the visit count for the interest for the date
    let stmt = this.db.createAsyncStatement(
      "INSERT OR REPLACE INTO moz_up_interests_visits " +
      "SELECT i.id, IFNULL(v.date_added, :dateAdded), IFNULL(v.visit_count, 0) + :visitCount " +
      "FROM moz_up_interests i " +
      "LEFT JOIN moz_up_interests_visits v " +
        "ON v.interest_id = i.id AND v.date_added = :dateAdded " +
      "WHERE i.interest = :interest");
    stmt.params.interest = interest;
    stmt.params.visitCount = visitCount;
    stmt.params.dateAdded = this._getRoundedTime(visitTime);
    stmt.executeAsync({
      handleResult: function (result) {},
      handleCompletion: function (reason) {
        deferred.resolve();
      },
      handleError: function (error) {
        deferred.reject(error);
      }
    });
    stmt.finalize();

    return deferred.promise;
  },

  /**
   * adds interest,host,date tuple to the moz_up_interests_hosts
   * @param   interest
   *          The interest string
   * @param   host
   *          The host string
   * @param   [optional] visitTime
   *          Date/time to associate with the visit defaulting to today
   * @returns Promise for when the row is added
   */
  addInterestForHost: function (aInterest, aHost, visitTime) {
    let returnDeferred = Promise.defer();
    Cu.reportError(typeof(aInterest));
    Cu.reportError("aInterest: " + aInterest);
    Cu.reportError("aHost: " + aHost);
    let stmt = this.db.createAsyncStatement(
      "INSERT OR IGNORE INTO moz_up_interests_hosts (interest_id, host_id, date_added) " +
      "VALUES((SELECT id FROM moz_up_interests WHERE interest =:interest) " +
      ", (SELECT id FROM moz_hosts WHERE host = :host) " +
      ", :dateAdded)");
    stmt.params.host = aHost;
    stmt.params.interest = aInterest;
    stmt.params.dateAdded = this._getRoundedTime(visitTime);
    stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
    stmt.finalize();
    return returnDeferred.promise;
  },

  getInterestsForHost: function(aHost, handleDataCallBack) {
    let returnDeferred = Promise.defer();
    let promiseHandler = new AsyncPromiseHandler(returnDeferred, function(row) {
      let interest = row.getResultByName("interest");
      if (handleDataCallBack) {
        handleDataCallBack(interest);
      }
      else {
        promiseHandler.addToResultSet(interest);
      }
    });

    let stmt = this.db.createAsyncStatement(
      "SELECT interest FROM moz_up_interests i, moz_up_interests_hosts ih, moz_hosts h " +
      "WHERE h.host = :host AND h.id = ih.host_id AND i.id = ih.interest_id");
    stmt.params.host = aHost;
    stmt.executeAsync(promiseHandler);
    stmt.finalize();
    return returnDeferred.promise;
  },

  getHostsForInterest: function (aInterest, handleDataCallBack) {
    let returnDeferred = Promise.defer();
    let promiseHandler = new AsyncPromiseHandler(returnDeferred, function(row) {
      let host = row.getResultByName("host");
      if (handleDataCallBack) {
        handleDataCallBack(host);
      }
      else {
        promiseHandler.addToResultSet(host);
      }
    });

    let stmt = this.db.createStatement(
      "SELECT h.host AS host FROM moz_hosts h , moz_up_interests i, moz_up_interests_hosts ih " +
      "WHERE i.interest = :interest AND h.id = ih.host_id AND i.id = ih.interest_id");
    stmt.params.interest = aInterest;
    stmt.executeAsync(promiseHandler);
    stmt.finalize();
    return returnDeferred.promise;
  },

  /**
   * Obtains a list of interests that occured 28 days from query time, ordered by score.
   * @param   interestLimit
   *          The number of interests to limit the result by.
   *          A negative value will not limit the results. Defaults to 5
   * @returns Promise with the interest and counts for each bucket
   */
  getTopInterests: function getTopInterests(interestLimit) {
    interestLimit = interestLimit || 5;
    let returnDeferred = Promise.defer();

    // Figure out the cutoff time for computation
    let currentTs = this._getRoundedTime();
    let cutOffDay = currentTs - 28 * MS_PER_DAY;

    let stmt = this.db.createStatement(
        "SELECT i.interest, v.visit_count, (:currentTs-v.date_added)/:MS_PER_DAY 'days_ago' " +
        "FROM moz_up_interests i " +
        "JOIN moz_up_interests_visits v ON v.interest_id = i.id " +
        "WHERE v.date_added >= :cutOffDay " +
        "ORDER BY v.date_added DESC"
    );
    stmt.params.MS_PER_DAY = MS_PER_DAY;
    stmt.params.currentTs = currentTs;
    stmt.params.cutOffDay = cutOffDay;

    let scores = {};
    let topInterests = [];
    let queryDeferred = Promise.defer();

    let promiseHandler = new AsyncPromiseHandler(queryDeferred,function(row) {
      let interest = row.getResultByName("interest");
      let visitCount = row.getResultByName("visit_count");
      let daysAgo = row.getResultByName("days_ago");

      if (!scores.hasOwnProperty(interest)) {
        scores[interest] = 0;
      }

      scores[interest] += visitCount * (1 - (daysAgo/29))
    });
    stmt.executeAsync(promiseHandler);
    stmt.finalize();

    queryDeferred.promise.then(function(resultSet) {
      // sort scores and cut off
      let interests = Object.keys(scores);
      for (let interestIndex=0; interestIndex < interests.length; interestIndex++) {
        let interest = interests[interestIndex];
        topInterests.push({name: interest, score: scores[interest]});
      }
      scores = null;

      topInterests.sort(function(x, y){return y.score - x.score});
      if (interestLimit > -1) {
        topInterests = topInterests.slice(0, interestLimit);
      }
    }).then(function() {
      // augment with bucket data

      let bucketPromises = [];
      for(let index=0; index < topInterests.length; index++) {
        let interest = topInterests[index];
        bucketPromises.push(PlacesInterestsStorage.getBucketsForInterest(interest.name));
      }

      Promise.promised(Array)(bucketPromises).then(function(buckets){

        for(let index=0; index < buckets.length; index++) {
          let bucket = buckets[index];
          topInterests[index]["recency"] = {
            immediate: bucket['immediate'],
            recent: bucket['recent'],
            past: bucket['past'],
          }
        }
        returnDeferred.resolve(topInterests);
      });
    });
    return returnDeferred.promise;
  },

  /**
   * Stores metadata for an interest. If the optional parameters are not passed, existing values will be preserved.
   * @param     interestName
   *            Interest name to store data for
   * @param     {threshold, duration, ignored, dateUpdated}
   *            An object with the option names as keys
   *            threshold: The visit count threshold that counts as a positive signal in bucket computation
   *            duration: The length of the 'immediate' and 'recent' periods in bucket computation
   *            ignored: Whether or not to use this interest when computing interest information
   *            dateUpdated: The timestamp in milliseconds of the day this interest was last updated. 0 means it was never updated. by default dateUpdated is today's date timestamp
   * @returns   promise for when the data is set
   */
  setMetaForInterest: function(interestName, optional={}) {
    let returnDeferred = Promise.defer();

    let {threshold, duration, ignored, dateUpdated} = optional;
    threshold = (typeof threshold == 'number') ? threshold : null;
    duration = (typeof duration == 'number') ? duration : null;
    ignored = (typeof ignored == 'boolean') ? ignored : null;
    dateUpdated = (typeof dateUpdated == 'undefined') ? this._getRoundedTime() : dateUpdated;

    let idSubQuery = "SELECT id FROM moz_up_interests WHERE interest = :interestName";
    // if interestName does not exist in moz_up_interests, query will fail
    let query = "INSERT OR REPLACE INTO moz_up_interests_meta (interest_id, bucket_visit_count_threshold, bucket_duration, ignored_flag, date_updated) "+
                "VALUES (" +
                "  ifnull((" + idSubQuery +"), 'invalid'), " +
                "  coalesce(:threshold, (SELECT bucket_visit_count_threshold FROM moz_up_interests_meta WHERE interest_id = (" + idSubQuery + "))), " +
                "  coalesce(:duration, (SELECT bucket_duration FROM moz_up_interests_meta WHERE interest_id = (" + idSubQuery + "))), " +
                "  coalesce(:ignored, (SELECT ignored_flag FROM moz_up_interests_meta WHERE interest_id = (" + idSubQuery + "))), " +
                "  coalesce(:dateUpdated, (SELECT date_updated FROM moz_up_interests_meta WHERE interest_id = (" + idSubQuery + ")))" +
                ")";
    let stmt = this.db.createAsyncStatement(query);
    stmt.params.interestName = interestName;
    stmt.params.threshold = threshold;
    stmt.params.duration = duration;
    stmt.params.ignored = ignored;
    stmt.params.dateUpdated = dateUpdated;
    stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
    stmt.finalize();
    return returnDeferred.promise;
  },

  /**
   * Obtains interest metadata for a list of interests
   * @param interests
            An array of interest names
   * @returns A promise with the interest metadata for each interest
   */
  getMetaForInterests: function(interests) {
    let returnDeferred = Promise.defer();

    if (!Array.isArray(interests)) {
      return deferred.reject(Error("invalid input"));
    }

    let query = "SELECT m.bucket_visit_count_threshold, " +
                "       m.bucket_duration, " +
                "       m.ignored_flag, " +
                "       m.date_updated " +
                "FROM moz_up_interests_meta m " +
                "JOIN moz_up_interests i ON m.interest_id = i.id " +
                "WHERE i.interest IN (" + genSQLParamList(interests) + ")";

    let stmt = this.db.createAsyncStatement(query);
    for(let i = 0; i < interests.length; i++) {
      stmt.bindByIndex(i, interests[i]);
    }

    let queryDeferred = Promise.defer();
    let promiseHandler = new AsyncPromiseHandler(queryDeferred,function(row) {
      promiseHandler.addToResultSet({
        threshold: row.getResultByName('bucket_visit_count_threshold'),
        duration: row.getResultByName('bucket_duration'),
        ignored: row.getResultByName('ignored_flag') ? true : false,
        dateUpdated: row.getResultByName('date_updated'),
      });
    });
    stmt.executeAsync(promiseHandler);
    stmt.finalize();

    queryDeferred.promise.then(function(resultSet){
      if(resultSet == undefined) {
        resultSet = [];
      }
      returnDeferred.resolve(resultSet);
    });

    return returnDeferred.promise;
  },

  /**
   * Increments the number of visits for an interest for a day
   * @param   interest
   *          The interest name string
   * @returns Promise with the interest and counts for each bucket
   */
  getBucketsForInterest: function(interest) {
    let deferred = Promise.defer();

    // Figure out the cutoff times for each bucket
    let currentTs = this._getRoundedTime();
    let immediateBucket = currentTs - 14 * MS_PER_DAY;
    let recentBucket = currentTs - 28 * MS_PER_DAY;

    // Aggregate the visits into each bucket for the interest
    let stmt = this.db.createAsyncStatement(
      "SELECT CASE WHEN v.date_added > :immediateBucket THEN 'immediate' " +
                  "WHEN v.date_added > :recentBucket THEN 'recent' " +
                  "ELSE 'past' END AS bucket, " +
             "v.visit_count " +
      "FROM moz_up_interests i " +
      "JOIN moz_up_interests_visits v ON v.interest_id = i.id " +
      "WHERE i.interest = :interest");
    stmt.params.interest = interest;
    stmt.params.immediateBucket = immediateBucket;
    stmt.params.recentBucket = recentBucket;

    // Initialize the result to have something for each bucket
    let result = {
      immediate: 0,
      interest: interest,
      past: 0,
      recent: 0
    };

    stmt.executeAsync({
      handleCompletion: function(reason) {
        deferred.resolve(result);
      },

      handleError: function(error) {
        deferred.reject(error);
      },

      handleResult: function(resultSet) {
        let row;
        while (row = resultSet.getNextRow()) {
          // Add up the total number of visits for this bucket
          let bucket = row.getResultByName("bucket");
          let visitCount = row.getResultByName("visit_count");
          result[bucket] += visitCount;
        }
      }
    });
    stmt.finalize();
    return deferred.promise;
  },
  /**
   * Clears tables from N last days worth of days
   * @param   daysAgo
   *          Number of days to be cleaned
   * @returns Promise for when the tables will be cleaned up
   */
  clearTables: function (daysAgo) {
    let timeStamp = this._getRoundedTime() - daysAgo * MS_PER_DAY;
    let borrowers = [Promise.defer(),Promise.defer()];
    let stmt = this.db.createStatement("DELETE FROM moz_up_interests_visits where date_added > :timeStamp");
    stmt.params.timeStamp = timeStamp;
    stmt.executeAsync(new AsyncPromiseHandler(borrowers[0]));
    stmt.finalize();

    stmt = this.db.createStatement("DELETE FROM moz_up_interests_hosts where date_added > :timeStamp");
    stmt.params.timeStamp = timeStamp;
    stmt.executeAsync(new AsyncPromiseHandler(borrowers[1]));
    stmt.finalize();

    // return the promises resolved when both deletes are complete
    return Promise.promised(Array)(borrowers.map(function(deferred) {return deferred.promise;})).then();
  },

  /**
   * returns tuples of (place_id,url,title) visisted between now and daysAgo
   * @param   daysAgo
   *          Number of days to be cleaned
   * @param   interestsCallback
   *          a callback handling url,title,visit_date,count tuple
   * @returns Promise for when the tables will be cleaned up
   */
   reprocessHistory: function (inDays,interestsCallback) {
    let returnDeferred = Promise.defer();
    let daysAgo = inDays || 300;

    let microSecondsAgo = (this._getRoundedTime() - (daysAgo * MS_PER_DAY)) * 1000;  // move to microseconds
    let query = "SELECT p.url url, p.title title, v.visit_day_stamp date, v.count count " +
    "FROM (SELECT place_id, visit_date - (visit_date % :MICROS_PER_DAY) visit_day_stamp, count(1) count " +
    "      FROM moz_historyvisits WHERE visit_date > :microSecondsAgo GROUP BY place_id,visit_day_stamp) v " +
    "JOIN moz_places p ON p.id = v.place_id " +
    "WHERE p.hidden = 0 AND p.visit_count > 0 ";
    let stmt = this.db.createStatement(query);
    stmt.params.MICROS_PER_DAY = MS_PER_DAY * 1000;  // move to microseconds
    stmt.params.microSecondsAgo = microSecondsAgo;

    let promiseHandler = new AsyncPromiseHandler(returnDeferred, function(row) {
        interestsCallback({visitDate: (+ row.getResultByName("date")) / 1000 ,  // this has to be in milliseconds
                           visitCount: row.getResultByName("count"),
                           url: row.getResultByName("url"),
                           title: row.getResultByName("title")});
    });
    stmt.executeAsync(promiseHandler);
    stmt.finalize();
    return returnDeferred.promise;
  }
}

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});
