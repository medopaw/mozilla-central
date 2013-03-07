// Sucky hacked-up synchronous storage for Places interests.
// THIS SHOULD BE ASYNCHRONOUS!

this.EXPORTED_SYMBOLS = [
  "PlacesInterestsStorage"
]

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/commonjs/sdk/core/promise.js");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils","resource://gre/modules/PlacesUtils.jsm");

const MS_PER_DAY = 86400000;


function AsyncPromiseHandler(deferred,rowCallback) {
  this.deferred = deferred;
  this.rowCallback = rowCallback;
  this.resultSet = undefined;
};

AsyncPromiseHandler.prototype = {
  addToResultSet: function(value) {
    if (!this.resultSet) this.resultSet = [];
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
    }
  }
};

let PlacesInterestsStorage = {

  getTodayTimeStamp: function() {
    // TODO: This function could be optimized by caching current day timestamp
    // We can also use julianday('now') from sqllite directly
    let time = Date.now();
    // return start of today + 1 millisecond
    return (time - time % MS_PER_DAY);
  },

  addInterest: function (aInterest) {
    let returnDeferred = Promise.defer();
    let stmt = this.db.createAsyncStatement("INSERT OR IGNORE INTO moz_up_interests (interest) VALUES(:interest)");
    stmt.params.interest = aInterest;
    stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
    stmt.finalize();
    return returnDeferred.promise;
  },

  addInterestVisit: function (aInterest) {
    let returnDeferred = Promise.defer();
    let insertDeferred = Promise.defer();
    let currentTs = this.getTodayTimeStamp();
    // TODO this code could be redone with replace or insert
    // make sure that interest,dateAdded record exists in the table
    let stmt = this.db.createAsyncStatement(
      "INSERT OR IGNORE INTO moz_up_interests_visits (interest_id,date_added) " +
      "VALUES((SELECT id FROM moz_up_interests WHERE interest = :interest), :dateAdded)");
    stmt.params.interest = aInterest;
    stmt.params.dateAdded = currentTs;
    stmt.executeAsync({
      handleResult: function (result) {},
      handleCompletion: function (reason) {insertDeferred.resolve();},
      handleError: function (error) {}
    });
    stmt.finalize();

    // now add 1 to that record
    // TODO we may avoid subselect by storing interest_id in local variable
    // let interest_id = (SELECT id FROM moz_up_interests WHERE interest = :interest)
    insertDeferred.promise.then(function () {
      stmt = this.db.createAsyncStatement(
        "UPDATE moz_up_interests_visits " +
        "SET visit_count = visit_count + 1 " +
        "WHERE interest_id = (SELECT id FROM moz_up_interests WHERE interest = :interest) AND date_added = :dateAdded");
      stmt.params.interest = aInterest;
      stmt.params.dateAdded = currentTs;
      stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
      stmt.finalize();
    }.bind(this));

    return returnDeferred.promise;
  },

  addInterestForHost: function (aInterest, aHost) {
    let returnDeferred = Promise.defer();
    Cu.reportError(typeof(aInterest));
    Cu.reportError("aInterest: " + aInterest);
    Cu.reportError("aHost: " + aHost);
    let currentTs = this.getTodayTimeStamp();
    let stmt = this.db.createAsyncStatement(
      "INSERT OR IGNORE INTO moz_up_interests_hosts (interest_id,host_id,date_added) " +
      "VALUES((SELECT id FROM moz_up_interests WHERE interest =:interest) " +
      ", (SELECT id FROM moz_hosts WHERE host = :host) " +
      ", :dateAdded)");
    stmt.params.host = aHost;
    stmt.params.interest = aInterest;
    stmt.params.dateAdded = currentTs;
    stmt.executeAsync(new AsyncPromiseHandler(returnDeferred));
    stmt.finalize();
    return returnDeferred.promise;
  },

  getInterestsForHost: function(aHost,handleDataCallBack) {
    let returnDeferred = Promise.defer();
    let promiseHandler = new AsyncPromiseHandler(returnDeferred,function(row) {
      let interest = row.getResultByName("interest");
      if (handleDataCallBack) handleDataCallBack(interest);
      else                    promiseHandler.addToResultSet(interest);
    });

  	let stmt = this.db.createAsyncStatement(
      "SELECT interest FROM moz_up_interests i, moz_up_interests_hosts ih, moz_hosts h " +
      "WHERE h.host = :host AND h.id = ih.host_id AND i.id = ih.interest_id");
    stmt.params.host = aHost;
    stmt.executeAsync(promiseHandler);
    stmt.finalize();
    return returnDeferred.promise;
  },

  getHostsForInterest: function (aInterest,handleDataCallBack) {
    let returnDeferred = Promise.defer();
    let promiseHandler = new AsyncPromiseHandler(returnDeferred,function(row) {
      let host = row.getResultByName("host");
      if (handleDataCallBack) handleDataCallBack(host);
      else                    promiseHandler.addToResultSet(host);
    });
  	let stmt = this.db.createStatement(
      "SELECT h.host AS host FROM moz_hosts h , moz_up_interests i, moz_up_interests_hosts ih " +
      "WHERE i.interest = :interest AND h.id = ih.host_id AND i.id = ih.interest_id");
    stmt.params.interest = aInterest;
    stmt.executeAsync(promiseHandler);
    stmt.finalize();
    return returnDeferred.promise;
  },

  getBucketsForInterest: function (aInterest,handleDataCallBack) {
    let currentTs = this.getTodayTimeStamp();
    let firstBucketEndTime = currentTs - 30*MS_PER_DAY;
    let secondBucketEndTime = currentTs - 60*MS_PER_DAY;
    let lastBucketEndTime = currentTs - 90*MS_PER_DAY;

    let returnDeferred = Promise.defer();
    let promiseHandler = new AsyncPromiseHandler(returnDeferred,function(row) {
      let value = {
        interest: aInterest,
        endTime: row.getResultByName("endTime"),
        visitCount: row.getResultByName("visitCount")
      };
      if (handleDataCallBack) handleDataCallBack(value);
      else                    promiseHandler.addToResultSet(value);
    });

  	let stmt = this.db.createAsyncStatement(
      "SELECT CASE WHEN date_added >= :firstBucketEndTime THEN :firstBucketEndTime " +
      "            WHEN date_added >= :secondBucketEndTime THEN :secondBucketEndTime " +
      "            ELSE :lastBucketEndTime END as endTime , SUM(visit_count) as visitCount " +
      "FROM moz_up_interests_visits " +
      "WHERE interest_id in (SELECT id FROM moz_up_interests WHERE interest = :interest) " +
      "ORDER by endTime DESC ");
    stmt.params.interest = aInterest;
    stmt.params.firstBucketEndTime = firstBucketEndTime;
    stmt.params.secondBucketEndTime = secondBucketEndTime;
    stmt.params.lastBucketEndTime = lastBucketEndTime;
    stmt.executeAsync(promiseHandler);
    stmt.finalize();
    return returnDeferred.promise;
  }

}

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});
