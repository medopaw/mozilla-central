/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

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
   * Increments the number of visits for an interest for a day
   * @param   interest
   *          The interest string
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
  }
}

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});
