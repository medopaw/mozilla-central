/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*-
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = [
  "PlacesInterestsStorage",
];

const {classes: Cc, interfaces: Ci, results: Cr, utils: Cu} = Components;

Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/InterestsDatabase.jsm");

const MS_PER_DAY = 86400000;

/**
 * Store the SQL statements used for this file together for easy reference
 */
const SQL = {
  addFrecentHost:
    "REPLACE INTO moz_interests_frecent_hosts VALUES(:id, :host, :frecency)",

  addInterestHost:
    "INSERT OR IGNORE INTO moz_interests_hosts (interest_id, host_id) " +
    "VALUES((SELECT id " +
            "FROM moz_interests " +
            "WHERE interest = :interest), " +
           "(SELECT id " +
            "FROM (SELECT id, host " +
                  "FROM moz_interests_frecent_hosts) " +
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
                    "ELSE 0 END) * " +
             "(NOT IFNULL(:checkSharable, 0) OR sharable) immediate, " +
           "SUM(CASE WHEN day > :today - duration * 2 AND " +
                         "day <= :today - duration THEN visits " +
                    "ELSE 0 END) * " +
             "(NOT IFNULL(:checkSharable, 0) OR sharable) recent, " +
           "SUM(CASE WHEN day <= :today - duration * 2 THEN visits " +
                    "ELSE 0 END) * " +
             "(NOT IFNULL(:checkSharable, 0) OR sharable) past " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_visits " +
    "ON interest_id = id " +
    "WHERE interest IN (:interests) " +
    "GROUP BY id",

  getDiversityForInterests:
    "SELECT interest, " +
           "COUNT(interest_id) * 100.0 / " +
             "(SELECT COUNT(DISTINCT host_id) " +
              "FROM moz_interests_hosts) * " +
             "(NOT IFNULL(:checkSharable, 0) OR sharable) diversity " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_hosts " +
    "ON interest_id = id " +
    "WHERE interest IN (:interests) " +
    "GROUP BY id",

  getInterests:
    "SELECT * " +
    "FROM moz_interests " +
    "WHERE interest IN (:interests)",

  getRecentHostsForInterests:
    "SELECT i.interest, h.host, h.frecency " +
    "FROM moz_interests i " +
      ", moz_interests_frecent_hosts h " +
      ", moz_interests_hosts ih " +
      ", moz_interests_visits iv " +
    "WHERE i.interest IN (:interests) " +
      "AND ih.host_id = h.id " +
      "AND ih.interest_id = i.id " +
      "AND iv.interest_id = i.id " +
      "AND iv.day > :dayCutoff " +
    "GROUP BY i.interest, h.host " +
    "ORDER BY h.frecency DESC",

  getScoresForInterests:
    "SELECT interest name, " +
           "IFNULL(SUM(visits * (1 - (:today - day) / 29.0)), 0) * " +
             "(NOT IFNULL(:checkSharable, 0) OR sharable) score " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_visits " +
    "ON interest_id = id AND " +
       "day >= :today - 28 " +
    "WHERE interest IN (:interests) " +
    "GROUP BY id " +
    "ORDER BY score DESC",

  getScoresForNamespace:
    "SELECT interest name, " +
           "IFNULL(SUM(visits * (1 - (:today - day) / 29.0)), 0) * " +
             "(NOT IFNULL(:checkSharable, 0) OR sharable) score " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_visits " +
    "ON interest_id = id AND " +
       "day >= :today - 28 " +
    "WHERE namespace = :namespace " +
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

  setSharedInterest:
    "REPLACE INTO moz_interests_shared " +
    "VALUES((SELECT id " +
            "FROM moz_interests " +
            "WHERE interest = :interest), " +
           ":host, " +
           ":day) ",

  getHostsForSharedInterests:
    "SELECT interest, host, day " +
    "FROM moz_interests " +
    "LEFT JOIN moz_interests_shared " +
    "ON interest_id = id " +
    "WHERE interest IN (:interests) AND " +
          "host NOT NULL " +
    "ORDER BY interest, day DESC ",

  getPersonalizedHosts:
    "SELECT interest, host, day " +
    "FROM moz_interests_shared " +
    "LEFT JOIN moz_interests " +
    "ON interest_id = id " +
    "WHERE day >= :dayCutoff AND " +
          "host NOT NULL " +
    "ORDER BY day DESC, host ",

};

let PlacesInterestsStorage = {
  //////////////////////////////////////////////////////////////////////////////
  //// PlacesInterestsStorage

  /**
   * Insert a frecent host (a host among 200 most frecent hosts)
   *
   * @param   id
   *          host id
   * @param   host
   *          host string
   * @param   frecency
   *          host frecency
   * @returns Promise for when the row is added
   */
  addFrecentHost: function PIS_addFrecentHost(id, host, frecency) {
    return this._execute(SQL.addFrecentHost, {
      params: {
        id: id,
        host: host,
        frecency: frecency,
      },
    });
  },

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
   * @param   [optional] options {see below}
   *          checkSharable: Boolean for 0-buckets for unshared defaulting false
   * @returns Promise with each interest as keys on an object with bucket data
   */
  getBucketsForInterests: function PIS_getBucketsForInterests(interests, options={}) {
    let {checkSharable} = options;
    return this._execute(SQL.getBucketsForInterests, {
      columns: ["immediate", "recent", "past"],
      key: "interest",
      listParams: {
        interests: interests,
      },
      params: {
        checkSharable: checkSharable,
        today: this._convertDateToDays(),
      },
    });
  },

  /**
   * Compute diversity values for interests
   *
   * @param   interests
   *          Array of interest strings
   * @param   [optional] options {see below}
   *          checkSharable: Boolean for 0-diversity for unshared defaulting false
   * @returns Promise with each interest as keys on an object with diversity
   */
  getDiversityForInterests: function PIS_getDiversityForInterests(interests, options={}) {
    let {checkSharable} = options;
    return this._execute(SQL.getDiversityForInterests, {
      columns: ["diversity"],
      key: "interest",
      listParams: {
        interests: interests,
      },
      params: {
        checkSharable: checkSharable,
      },
    });
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
   * Fetch recently visited hosts for interests, ranked by frecency
   *
   * @param   interests
   *          Array of interest strings to select
   * @param   daysAgo
   *          Number of days of recent history to fetch
   * @returns Promise with hostname/last day visited as results
   */
  getRecentHostsForInterests: function PIS_getRecentHostsForInterests(interests, daysAgo) {
    return this._execute(SQL.getRecentHostsForInterests, {
      columns: ["interest", "host", "frecency"],
      listParams: {
        interests: interests,
      },
      params: {
        dayCutoff: this._convertDateToDays() - daysAgo,
      },
    });
  },

  /**
   * Get a sorted array of interests by score
   *
   * @param   interests
   *          Array of interest strings to select
   * @param   [optional] options {see below}
   *          checkSharable: Boolean for 0-score for unshared defaulting false
   * @returns Promise with the array of interest names and scores
   */
  getScoresForInterests: function PIS_getScoresForInterests(interests, options={}) {
    let {checkSharable} = options;
    return this._execute(SQL.getScoresForInterests, {
      columns: ["name", "score"],
      listParams: {
        interests: interests,
      },
      params: {
        checkSharable: checkSharable,
        today: this._convertDateToDays(),
      },
    });
  },

  /**
   * Get a sorted array of top interests for a namespace by score
   *
   * @param   namespace
   *          Namespace string of interests in the namespace to select
   * @param   [optional] options {see below}
   *          checkSharable: Boolean for 0-score for unshared defaulting false
   *          interestLimit: Number of top interests to select defaulting to 5
   * @returns Promise with the array of interest names and scores
   */
  getScoresForNamespace: function PIS_getScoresForNamespace(namespace, options={}) {
    let {checkSharable, interestLimit} = options;
    return this._execute(SQL.getScoresForNamespace, {
      columns: ["name", "score"],
      params: {
        checkSharable: checkSharable,
        interestLimit: interestLimit,
        namespace: namespace,
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
        namespace: this._splitInterestName(interest)[0],
        sharable: sharable,
        threshold: threshold,
      },
    });
  },

  /**
   * Set (insert or update) an interest being shared with a domain
   *
   * @param   interest
   *          Full interest name with namespace to set
   * @param   host
   *          host of the site an interest was shared with
   * @param   [optional] visitTime
   *          time when an interest was shared with the site
   * @returns Promise for when the interest,domain pair is set
   */
  setSharedInterest: function PIS_setSharedInterest(interest, host, visitTime) {
    return this._execute(SQL.setSharedInterest, {
      params: {
        interest: interest,
        host: host,
        day: this._convertDateToDays(visitTime),
      },
    });
  },

  /**
   * Get a sorted array of 'shared-with' domains by day of the visit for each interest
   *
   * @param   interests
   *          interests that were shared
   * @returns Promise with an array of {intrest,domains,day} objects
   */
  getHostsForSharedInterests: function PIS_getHostsForSharedInterests(interests) {
    return this._execute(SQL.getHostsForSharedInterests, {
      columns: ["interest","host", "day"],
      listParams: {
        interests: interests,
      },
    });
  },

  /**
   * Get a sorted array of 'shared-with' domains,interests by day of the visit
   *
   * @param   daysAgo
   *          Number of days of history to fetch
   * @returns Promise with an array of {intrest,domains,day} objects
   */
  getPersonalizedHosts: function PIS_getPersonalizedDomains(daysAgo) {
    return this._execute(SQL.getPersonalizedHosts, {
      columns: ["interest","host", "day"],
      params: {
        dayCutoff: this._convertDateToDays() - (daysAgo || 180),
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
    // Determine the type of result as nothing, a keyed object or array of columns
    let results;
    if (onRow != null) {}
    else if (key != null) {
      results = {};
    }
    else if (columns != null) {
      results = [];
    }
    // get a hold of interests database connection (it's Sqlite.jsm connection)
    return InterestsDatabase.DBConnectionPromise.then(connection => {
      // execute cached sql statement
      return connection.executeCached(sql, params, function (row) {
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
      }).then(() => {
        return results;
      });
    });
  },

  /**
   * Extract the namespace from a fully-qualified interest name
   *
   * @param   interest
   *          Interest string in the namespace/name format
   * @returns [Namespace or empty string, interest name]
   */
  _splitInterestName: function PIS__splitInterestName(interest) {
    let tokens = interest.split(":", 2);

    // Add an empty namespace if there was no ":"
    if (tokens.length < 2) {
      tokens.unshift("");
    }

    return tokens;
  },
}

