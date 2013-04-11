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

  addInterestVisit:
    "REPLACE INTO moz_interests_visits " +
    "SELECT id, " +
           "IFNULL(day, :day), " +
           "IFNULL(visits, 0) + IFNULL(:visits, 1) " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_visits " +
    "ON interest_id = id AND " +
       "day = :day " +
    "WHERE interest = :interest",

  clearRecentVisits:
    "DELETE FROM moz_interests_visits " +
    "WHERE day > :dayCutoff",

  getBucketsForInterests:
    "SELECT interest, " +
           "SUM(CASE WHEN day > :today - duration THEN visits " +
                    "ELSE 0 END) immediate, " +
           "SUM(CASE WHEN day > :today - duration * 2 AND " +
                         "day <= :today - duration THEN visits " +
                    "ELSE 0 END) recent, " +
           "SUM(CASE WHEN day <= :today - duration * 2 THEN visits " +
                    "ELSE 0 END) past " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_visits " +
    "ON interest_id = id " +
    "WHERE interest IN (:interests) " +
    "GROUP BY id",

  getInterests:
    "SELECT * " +
    "FROM moz_interests " +
    "WHERE interest IN (:interests)",

  getRecentHistory:
    "SELECT title, url, visitCount, visitDate " +
    "FROM moz_places " +
    "JOIN (SELECT place_id, " +
                 "COUNT(1) visitCount, " +
                 "visit_date/1000 - visit_date/1000 % :MS_PER_DAY visitDate " +
          "FROM moz_historyvisits " +
          "WHERE visit_date > :dayCutoff * :MS_PER_DAY*1000 " +
          "GROUP BY place_id, visitDate) " +
    "ON place_id = id " +
    "WHERE hidden = 0 AND " +
          "visit_count > 0",

  getScoresForNamespace:
    "SELECT interest name, " +
           "IFNULL(SUM(visits * (1 - (:today - day) / 29.0)), 0) score " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_visits " +
    "ON interest_id = id AND " +
       "day >= :today - 28 " +
    "WHERE namespace = :namespace AND " +
          "(NOT IFNULL(:onlySharable, 0) OR sharable = 1) " +
    "GROUP BY id " +
    "ORDER BY score DESC " +
    "LIMIT IFNULL(:interestLimit, 5)",

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
   * Increment or initialize the number of visits for an interest on a day
   *
   * @param   interest
   *          The full interest string with namespace
   * @param   [optional] visitData {see below}
   *          visitCount: Number of visits to add defaulting to 1
   *          visitTime: Date/time to associate with the visit defaulting to now
   * @returns Promise for when the row is added/updated
   */
  addInterestVisit: function PIS_addInterestVisit(interest, visitData={}) {
    let {visitCount, visitTime} = visitData;
    return this._execute(SQL.addInterestVisit, {
      params: {
        day: this._convertDateToDays(visitTime),
        interest: interest,
        visits: visitCount,
      },
    });
  },

  /**
   * Clear recent visits for all interests
   *
   * @param   daysAgo
   *          Number of recent days to be cleared
   * @returns Promise for when the visits are deleted
   */
  clearRecentVisits: function PIS_clearRecentVisits(daysAgo) {
    return this._execute(SQL.clearRecentVisits, {
      params: {
        dayCutoff: this._convertDateToDays() - daysAgo,
      },
    });
  },

  /**
   * Generate buckets data for interests
   *
   * @param   interests
   *          Array of interest strings
   * @returns Promise with each interest as keys on an object with bucket data
   */
  getBucketsForInterests: function PIS_getBucketsForInterests(interests) {
    return this._execute(SQL.getBucketsForInterests, {
      columns: ["immediate", "recent", "past"],
      key: "interest",
      listParams: {
        interests: interests,
      },
      params: {
        today: this._convertDateToDays(),
      },
    });
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
   * Fetch recent history visits to process by page and day of visit
   *
   * @param   daysAgo
   *          Number of days of recent history to fetch
   * @param   handlePageForDay
   *          Callback handling a day's visits for a page
   * @returns Promise for when all the recent pages have been processed
   */
  getRecentHistory: function PIS_getRecentHistory(daysAgo, handlePageForDay) {
    return this._execute(SQL.getRecentHistory, {
      columns: ["title", "url", "visitCount", "visitDate"],
      onRow: handlePageForDay,
      params: {
        dayCutoff: this._convertDateToDays() - daysAgo,
        MS_PER_DAY: MS_PER_DAY,
      },
    });
  },

  /**
   * Get a sorted array of top interests for a namespace by score
   *
   * @param   namespace
   *          Namespace string of interests in the namespace to select
   * @param   [optional] options {interestLimit, onlySharable}
   *          interestLimit: Number of top interests to select defaulting to 5
   *          onlySharable: Boolean for only sharable interests defaulting false
   * @returns Promise with the interest and counts for each bucket
   */
  getScoresForNamespace: function PIS_getScoresForNamespace(namespace, options={}) {
    let {interestLimit, onlySharable} = options;
    return this._execute(SQL.getScoresForNamespace, {
      columns: ["name", "score"],
      params: {
        interestLimit: interestLimit,
        namespace: namespace,
        onlySharable: onlySharable,
        today: this._convertDateToDays(),
      },
    });
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
