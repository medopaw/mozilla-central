/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

this.EXPORTED_SYMBOLS = [
  "InterestsDatabase",
];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Sqlite.jsm");
Cu.import("resource://gre/modules/Task.jsm");
Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");

// observer event topics
const kShutdown = "quit-application";

const DB_VERSION = 1;
const SCHEMA = {
  tables : {
    moz_interests :
      "CREATE TABLE moz_interests (" +
      "  id INTEGER PRIMARY KEY" +
      ", interest TEXT NOT NULL UNIQUE" +
      ", namespace TEXT NOT NULL" +
      ", sharable INTEGER DEFAULT 1 NOT NULL" +
      ")"
    ,
    moz_interests_hosts :
      "CREATE TABLE moz_interests_hosts (" +
      "  interest_id INTEGER NOT NULL" +
      ", host TEXT NOT NULL" +
      ", PRIMARY KEY (interest_id, host)" +
      ")"
    ,
    moz_interests_visits :
      "CREATE TABLE moz_interests_visits (" +
      "  interest_id INTEGER NOT NULL" +
      ", day INTEGER NOT NULL" +
      ", visits INTEGER NOT NULL" +
      ", PRIMARY KEY (interest_id, day)" +
      ")"
    ,
    moz_interests_shared :
      "CREATE TABLE moz_interests_shared (" +
      "  interest_id INTEGER NOT NULL" +
      ", host TEXT NOT NULL" +
      ", day INTEGER NOT NULL" +
      ", PRIMARY KEY (interest_id, host)" +
      ")"
    ,
  },
  indices : {
    moz_shared_interest_index : {
      table   : "moz_interests_shared",
      columns : ["interest_id"]
    },
    moz_shared_host_index : {
      table   : "moz_interests_shared",
      columns : ["host"]
    },
  }
};

let InterestsDatabase = {

  //////////////////////////////////////////////////////////////////////////////
  //// Fields

  // Sqlite connection
  _dbConnectionPromise: null,

  // Database creation/migration promise, resolved to true in the event of
  // creation or migration.  Otherwise is resolved to false.
  _dbMigrationPromiseDeferred: Promise.defer(),

  //////////////////////////////////////////////////////////////////////////////
  //// Public API

  /**
   * Opens and caches new connection
   *
   * @returns Promise resulting in an established connection
  */
  get DBConnectionPromise() {
    if (this._dbConnectionPromise == null) {
      this._dbConnectionPromise = this._openDatabaseConnection();
    }
    return this._dbConnectionPromise;
  },

  /**
   * returns a promise resolved to migration flag
   *
   * @returns Promise resolving to true upon creation or migration
  */
  getDbMigrationPromise: function ID_getDbMigrationPromise() {
    return this._dbMigrationPromiseDeferred.promise;
  },

  //////////////////////////////////////////////////////////////////////////////
  //// Helpers

  /**
   * Opens a Sqlite connection to interests database
   *
   * @returns Promise resulting in an established connection
  */
  _openDatabaseConnection: function ID__openDatabaseConnection() {
    let dbFile = Services.dirsvc.get("ProfD", Ci.nsIFile).clone();
    dbFile.append("interests.sqlite");

    return Task.spawn(function () {
      let connection = yield Sqlite.openConnection({
         path: dbFile.path,
         sharedMemoryCache: false,
      });

      try {
        yield this._dbInit(connection);
      }
      catch (ex) {
        yield connection.close();
        throw ex;
      }

      // Be sure to cleanly close this connection.
      Services.obs.addObserver(function DBCloseCallback(aSubject, aTopic, aData) {
        Services.obs.removeObserver(DBCloseCallback, aTopic);
        connection.close();
      }, "profile-change-teardown", false);

      throw new Task.Result(connection);
    }.bind(this));
  },

  /*
   * Attempts to popuate or migrate a database
   *
   * @param   connection
   *          an established connection
   * @returns Promise of the task completion
   */
  _dbInit : function ID__dbInit(connection) {
    return connection.getSchemaVersion().then(version => {
      if (version == 0)
        return this._dbCreate(connection).then(() => {
          this._dbMigrationPromiseDeferred.resolve(true);
        });
      else if(version != DB_VERSION)
        return this._dbMigrate(connection,version).then(() => {
          this._dbMigrationPromiseDeferred.resolve(true);
        });
      else
        this._dbMigrationPromiseDeferred.resolve(false);
    });
  },

  /*
   * Creates Schema tables and indexes
   *
   * @param   connection
   *          an established connection
   * @returns Promise of the task completion
   */
  _dbCreate: function ID__dbCreate(connection) {
    let promises = [];
    for (let name in SCHEMA.tables) {
      let statement = SCHEMA.tables[name];
      promises.push(connection.execute(statement));
    }

    for (let name in SCHEMA.indices) {
      let index = SCHEMA.indices[name];
      let statement = "CREATE INDEX IF NOT EXISTS " + name + " ON " + index.table +
              "(" + index.columns.join(", ") + ")";
      promises.push(connection.execute(statement));
    }
    promises.push(connection.setSchemaVersion(DB_VERSION));
    return Promise.promised(Array)(promises).then();
  },

  /*
   * Migrates database
   *
   * @param   connection
   *          an established connection
   * @param   version
   *          old version of database
   * @returns Promise of the task completion
   *          currently resolves immediately
   */
  _dbMigrate: function ID__dbMigrate(connection,version) {
     let deferred = Promise.defer();
     deferred.resolve(connection);
     return deferred.promise;
   },
};
