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

/**
 * Store the SQL statements used for this file together for easy reference
 */
const SQL = {
  addInterestHost:
    "INSERT OR IGNORE INTO moz_interests_hosts (interest_id, host_id) " +
    "VALUES((SELECT id " +
            "FROM moz_interests " +
            "WHERE interest = :interest), " +
           "(SELECT id " +
            "FROM (SELECT id, host " +
                  "FROM moz_hosts " +
                  "ORDER BY frecency DESC " +
                  "LIMIT 200) " +
            "WHERE host = :host))",

  getInterests:
    "SELECT * " +
    "FROM moz_interests " +
    "WHERE interest IN (:interests)",

  setInterest:
    "REPLACE INTO moz_interests " +
    "VALUES((SELECT id " +
            "FROM moz_interests " +
            "WHERE interest = :interest), " +
           ":interest, " +
           ":namespace, " +
           "IFNULL(:duration, " +
                  "(SELECT duration " +
                   "FROM moz_interests " +
                   "WHERE interest = :interest)), " +
           "IFNULL(:threshold, " +
                  "(SELECT threshold " +
                   "FROM moz_interests " +
                   "WHERE interest = :interest)), " +
           "IFNULL(:sharable, " +
                  "(SELECT sharable " +
                   "FROM moz_interests " +
                   "WHERE interest = :interest)))",
};

/*
 * Generates a string for use with the SQLite client for binding parameters by array indexing
 */
function genSQLParamList(aNumber) {
  let paramStr = "";
  for (let index = 1; index <= aNumber; index++) {
    paramStr += "?" + index;
    if (index < aNumber) {
      paramStr += ",";
    }
  }
  return paramStr
}

function AsyncPromiseHandler(deferred, rowCallback) {
  this.deferred = deferred;
  this.rowCallback = rowCallback;
  this.result = undefined;
};

AsyncPromiseHandler.prototype = {
  initResults: function(value) {
      this.result = value;
  },
  addToResultObject: function(key,value) {
    if (!this.result) {
      this.result = {};
    }
    this.result[key] = value;
  },
  addToResultSet: function(value) {
    if (!this.result) {
      this.result = [];
    }
    this.result.push(value);
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
        this.deferred.resolve(this.result);
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

  //////////////////////////////////////////////////////////////////////////////
  //// PlacesInterestsStorage

  /**
   * Record the pair of interest and host
   *
   * @param   interest
   *          The full interest string with namespace
   * @param   host
   *          The host string to associate with the interest
   * @returns Promise for when the row is added
   */
  addInterestHost: function PIS_addInterestHost(interest, host) {
    return this._execute(SQL.addInterestHost, {
      params: {
        host: host,
        interest: interest,
      },
    });
  },

  /**
   * Increments the number of visits for an interest for a day
   * @param   aInterest
   *          The interest string
   * @param   {visitTime, visitCount}
   *          An object with the option names as keys
   *          visitTime: Date/time to associate with the visit, defaulting to today
   *          visitCount: The number of counts to add, defaulting to 1
   * @returns Promise for when the interest's visit is added
   */
  addInterestVisit: function(interest, optional={}){
    let {visitTime, visitCount} = optional;
    visitCount = visitCount || 1;

    let deferred = Promise.defer();
    // Increment or initialize the visit count for the interest for the date
    let stmt = this.db.createAsyncStatement(
      "REPLACE INTO moz_up_interests_visits " +
      "SELECT i.id, IFNULL(v.date_added, :dateAdded), IFNULL(v.visit_count, 0) + :visitCount " +
      "FROM moz_interests i " +
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
   * Obtains a list of interests that occured 28 days from query time, ordered by score.
   * @param   interestLimit
   *          The number of interests to limit the result by.
   *          A negative value will not limit the results. Defaults to 5
   * @param   filterIgnores [optional]
   *          Optional parameter that sets whether to filter ignored and to-be downloaded interests. Defaults to true.
   * @returns Promise with the interest and counts for each bucket
   */
  getTopInterests: function getTopInterests(interestLimit, filterIgnores=true) {
    let returnDeferred = Promise.defer();
    interestLimit = interestLimit || 5;

    if (typeof interestLimit != 'number' || interestLimit < 1) {
      return returnDeferred.reject("invalid input");
    }

    // Figure out the cutoff time for computation
    let currentTs = this._getRoundedTime();
    let cutOffDay = currentTs - 28 * MS_PER_DAY;

    let sql = "SELECT i.interest, v.visit_count, (:currentTs-v.date_added)/:MS_PER_DAY 'days_ago' " +
              "FROM moz_interests i " +
              "JOIN moz_up_interests_visits v ON v.interest_id = i.id " +
              "WHERE v.date_added >= :cutOffDay ";
    if (filterIgnores) {
      sql += "AND i.sharable = 1 ";
    }
    sql += "ORDER BY v.date_added DESC";

    let stmt = this.db.createStatement(sql);
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

    queryDeferred.promise.then(function() {
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
      returnDeferred.resolve(topInterests);
    });

    return returnDeferred.promise;
  },

  /**
   * computes buckets data for an interest
   * @param   interest
   *          The interest name string
   * @returns Promise with the interest and counts for each bucket
   */
  getBucketsForInterest: function(interest) {
    let deferred = Promise.defer();

    // Figure out the cutoff times for each bucket
    let currentTs = this._getRoundedTime();
    this.getInterests([interest]).then(function(metaData) {
      let duration = metaData[interest].duration;
      let immediateBucket = currentTs - duration * MS_PER_DAY;
      let recentBucket = currentTs - duration*2 * MS_PER_DAY;

      // Aggregate the visits into each bucket for the interest
      let stmt = PlacesInterestsStorage.db.createAsyncStatement(
        "SELECT CASE WHEN v.date_added > :immediateBucket THEN 'immediate' " +
                    "WHEN v.date_added > :recentBucket THEN 'recent' " +
                    "ELSE 'past' END AS bucket, " +
                    "v.visit_count " +
        "FROM moz_interests i " +
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

      let queryDeferred = Promise.defer();
      let promiseHandler = new AsyncPromiseHandler(queryDeferred, function(row) {
        let bucket = row.getResultByName("bucket");
        let visitCount = row.getResultByName("visit_count");
        result[bucket] += visitCount;
      });
      stmt.executeAsync(promiseHandler);
      stmt.finalize();

      queryDeferred.promise.then(function(){
        deferred.resolve(result);
      });
    });

    return deferred.promise;
  },
  /**
   * computes divercity values for interests
   * @param   interests
   *          array of interest name strings
   * @returns Promise with an object (interest:diversity) pairs
   */
  getDiversityForInterests: function(interests) {
    let returnDeferred = Promise.defer();

    let stmt = PlacesInterestsStorage.db.createAsyncStatement(
      "SELECT i.interest interest, " +
      "ROUND(count(1) * 100.0 / " +
      "      (SELECT COUNT(DISTINCT host_id) " +
      "       FROM moz_interests_hosts), 2) diversity " +
      "FROM moz_interests i " +
      "JOIN moz_interests_hosts h ON h.interest_id = i.id " +
      "WHERE i.interest in  ( " + genSQLParamList(interests.length) + ") " +
      "GROUP BY  i.interest ");

    // bind parameters by array index
    for (let i = 0; i < interests.length; i++) {
      stmt.bindByIndex(i, interests[i]);
    }

    let promiseHandler = new AsyncPromiseHandler(returnDeferred,function(row) {
      promiseHandler.addToResultObject(row.getResultByName("interest"),
                                       row.getResultByName("diversity"));
    });
    promiseHandler.initResults({});
    stmt.executeAsync(promiseHandler);
    stmt.finalize();

    return returnDeferred.promise;
  },
  /**
   * Clears interests_visits table from N last days worth of days
   * @param   daysAgo
   *          Number of days to be cleaned
   * @returns Promise for when the table will be cleaned up
   */
   clearRecentInterests: function (daysAgo) {
    let returnDeferred = Promise.defer();
    let timeStamp = this._getRoundedTime() - (daysAgo || 300) * MS_PER_DAY;
    let stmt = this.db.createStatement("DELETE FROM moz_up_interests_visits where date_added > :timeStamp");
    stmt.params.timeStamp = timeStamp;
    stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
    stmt.finalize();
    return returnDeferred.promise;
  },

  /**
   * Obtains interest metadata for a list of interests
   * @param   interests
              An array of interest names
   * @returns A promise with the interest metadata for each interest
   */
  getInterests: function PIS_getInterests(interests) {
    return this._execute(SQL.getInterests, {
      columns: ["duration", "sharable", "threshold"],
      key: "interest",
      listParams: {
        interests: interests,
      },
    });
  },

  /**
   * returns tuples of (place_id,url,title) visisted between now and daysAgo
   * @param   daysAgo
   *          Number of days to be cleaned
   * @param   interestsCallback
   *          a callback handling url,title,visit_date,count tuple
   * @returns Promise for when the tables will be cleaned up
   */
  reprocessRecentHistoryVisits: function (daysAgo,interestsCallback) {
    let returnDeferred = Promise.defer();

    let microSecondsAgo = (this._getRoundedTime() - ((daysAgo || 0) * MS_PER_DAY)) * 1000; // move to microseconds
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
  },

  /**
   * Set (insert or update) metadata for an interest
   *
   * @param   interest
   *          Full interest name with namespace to set
   * @param   [optional] metadata {see below}
   *          duration: Number of days of visits to include in buckets
   *          sharable: Boolean user preference if the interest can be shared
   *          threshold: Number of visits in a bucket to signal recency interest
   * @returns Promise for when the interest data is set
   */
  setInterest: function PIS_setInterest(interest, metadata={}) {
    let {duration, sharable, threshold} = metadata;
    return this._execute(SQL.setInterest, {
      params: {
        duration: duration,
        interest: interest,
        namespace: this._extractNamespace(interest),
        sharable: sharable,
        threshold: threshold,
      },
    });
  },

  //////////////////////////////////////////////////////////////////////////////
  //// PlacesInterestsStorage Helpers

  /**
   * Convert a date to days since epoch
   *
   * @param   [optional] time
   *          Reference date/time defaulting to today
   * @returns Number of days since epoch to beginning of today UTC
   */
  _convertDateToDays: function PIS__convertDateToDays(time=null) {
    // Default to today and truncate to an integer number of days
    return Math.floor((time || Date.now()) / MS_PER_DAY);
  },

  /**
   * Execute a SQL statement with various options
   *
   * @param   sql
   *          The SQL statement to execute
   * @param   [optional] optional {see below}
   *          columns: Array of column strings to read for array format result
   *          key: Additional column string to trigger object format result
   *          listParams: Object to expand the key to a SQL list
   *          onRow: Function callback given the columns for each row
   *          params: Object of keys matching SQL :param to bind values
   * @returns Promise for when the statement completes with value dependant on
   *          the optional values passed in.
   */
  _execute: function PIS__execute(sql, optional={}) {
    let {columns, key, listParams, onRow, params} = optional;

    // Convert listParams into params and the desired number of identifiers
    if (listParams != null) {
      params = params || {};
      Object.keys(listParams).forEach(listName => {
        let listIdentifiers = [];
        for (let i = 0; i < listParams[listName].length; i++) {
          let paramName = listName + i;
          params[paramName] = listParams[listName][i];
          listIdentifiers.push(":" + paramName);
        }

        // Replace the list placeholders with comma-separated identifiers
        sql = sql.replace(":" + listName, listIdentifiers, "g");
      });
    }

    // Initialize the statement cache and the callback to clean it up
    if (this._cachedStatements == null) {
      this._cachedStatements = {};
      PlacesUtils.registerShutdownFunction(() => {
        Object.keys(this._cachedStatements).forEach(key => {
          this._cachedStatements[key].finalize();
        });
      });
    }

    // Use a cached version of the statement if handy; otherwise created it
    let statement = this._cachedStatements[sql];
    if (statement == null) {
      statement = this._db.createAsyncStatement(sql);
      this._cachedStatements[sql] = statement;
    }

    // Bind params if we have any
    if (params != null) {
      Object.keys(params).forEach(param => {
        statement.bindByName(param, params[param]);
      });
    }

    // Determine the type of result as nothing, a keyed object or array of columns
    let results;
    if (onRow != null) {}
    else if (key != null) {
      results = {};
    }
    else if (columns != null) {
      results = [];
    }

    // Execute the statement and update the promise accordingly
    let deferred = Promise.defer();
    statement.executeAsync({
      handleCompletion: reason => {
        deferred.resolve(results);
      },

      handleError: error => {
        deferred.reject(new Error(error.message));
      },

      handleResult: resultSet => {
        let row;
        while (row = resultSet.getNextRow()) {
          // Read out the desired columns from the row into an object
          let result;
          if (columns != null) {
            // For just a single column, make the result that column
            if (columns.length == 1) {
              result = row.getResultByName(columns[0]);
            }
            // For multiple columns, put as valyes on an object
            else {
              result = {};
              columns.forEach(column => {
                result[column] = row.getResultByName(column);
              });
            }
          }

          // Give the packaged result to the handler
          if (onRow != null) {
            onRow(result);
          }
          // Store the result keyed on the result key
          else if (key != null) {
            results[row.getResultByName(key)] = result;
          }
          // Append the result in order
          else if (columns != null) {
            results.push(result);
          }
        }
      }
    });

    return deferred.promise;
  },

  /**
   * Extract the namespace from a full interest name
   *
   * @param   interest
   *          Interest string in the namespace/name format
   * @returns Namespace string or empty for no namespace
   */
  _extractNamespace: function PIS__extractNamespace(interest) {
    let slashPos = interest.indexOf("/");
    return slashPos == -1 ? "" : interest.slice(0, slashPos);
  },
}

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "_db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});
