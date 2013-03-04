// Sucky hacked-up synchronous storage for Places interests.
// THIS SHOULD BE ASYNCHRONOUS!

this.EXPORTED_SYMBOLS = [
  "PlacesInterestsStorage"
]

const Ci = Components.interfaces;
const Cc = Components.classes;
const Cr = Components.results;
const Cu = Components.utils;

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
XPCOMUtils.defineLazyModuleGetter(this, "PlacesUtils",
                                  "resource://gre/modules/PlacesUtils.jsm");

const DataMiliSeconds = 86400000;

let PlacesInterestsStorage = {

  getTodayTimeStamp: function() {
    // TODO: This function could be optimized by caching current day timestamp
    // We can also use julianday('now') from sqllite directly
    let time = Date.now();
    // return start of today + 1 millisecond
    return (time - time % DataMiliSeconds);
  },

  addInterest: function (aInterest) {
    Cu.reportError(typeof(aInterest));
    Cu.reportError("adding aInterest: " + aInterest);
    let stmt = this.db.createStatement("INSERT OR IGNORE INTO moz_up_interests (interest) VALUES(:interest)");
    stmt.params.interest = aInterest;
    stmt.execute();
    stmt.finalize();
  },

  addInterestVisit: function (aInterest) {
    Cu.reportError(typeof(aInterest));
    Cu.reportError("adding visit to aInterest: " + aInterest);

    let currentTs = this.getTodayTimeStamp();
    // TODO this code could be redone with replace or insert
    // make sure that interest,dateAdded record exists in the table
    let stmt = this.db.createStatement(
      "INSERT OR IGNORE INTO moz_up_interests_visits (interest_id,date_added) " +
      "VALUES((SELECT id FROM moz_up_interests WHERE interest = :interest), :dateAdded)");
    stmt.params.interest = aInterest;
    stmt.params.dateAdded = currentTs;
    stmt.execute();
    stmt.finalize();

    // now add 1 to that record
    // TODO we may avoid subselect by storing interest_id in local variable
    // let interest_id = (SELECT id FROM moz_up_interests WHERE interest = :interest)

    stmt = this.db.createStatement(
      "UPDATE moz_up_interests_visits " +
      "SET visit_count = visit_count + 1 " +
      "WHERE interest_id = (SELECT id FROM moz_up_interests WHERE interest = :interest) AND date_added = :dateAdded");
    stmt.params.interest = aInterest;
    stmt.params.dateAdded = currentTs;
    stmt.execute();
    stmt.finalize();
  },

  addInterestForHost: function (aInterest, aHost) {
    Cu.reportError(typeof(aInterest));
    Cu.reportError("aInterest: " + aInterest);
    Cu.reportError("aHost: " + aHost);
    let currentTs = this.getTodayTimeStamp();
    let stmt = this.db.createStatement(
      "INSERT OR IGNORE INTO moz_up_interests_hosts (interest_id,host_id,date_added) " +
      "VALUES((SELECT id FROM moz_hosts WHERE host = :host) " +
      ", (SELECT id FROM moz_up_interests WHERE interest =:interest) " +
      ", :dateAdded)");
    stmt.params.host = aHost;
    stmt.params.interest = aInterest;
    stmt.params.dateAdded = currentTs;
    stmt.execute();
    stmt.finalize();
  },

  getInterestsForHost: function(aHost) {
  	let interests = [];
  	let stmt = this.db.createStatement(
      "SELECT interest FROM moz_up_interests i " +
      "JOIN moz_hosts h ON h.id = i.host " +
      "WHERE h.host = :host ");
    stmt.params.host = aHost;
    while (stmt.executeStep()) {
      interests.push(stmt.row.interest);
    }
    stmt.finalize();
    return interests;
  },

  getHostsForInterest: function (aInterest) {
  	let hosts = [];
  	let stmt = this.db.createStatement(
      "SELECT h.host AS host FROM moz_hosts h " +
      "JOIN moz_up_interests i ON h.id = i.host " +
      "WHERE i.host IN (SELECT host from moz_up_interests WHERE interest = :interest)");
    stmt.params.interest = aInterest;
    while (stmt.executeStep()) {
      hosts.push(stmt.row.host);
    }
    stmt.finalize();
    return hosts;
  },

  getBucketsForInterest: function (aInterest) {
  	let buckets = [];
    let currentTs = this.getTodayTimeStamp();
    let firstBucketEndTime = currentTs - 30*DataMiliSeconds;
    let secondBucketEndTime = currentTs - 60*DataMiliSeconds;
    let lastBucketEndTime = currentTs - 90*DataMiliSeconds;

  	let stmt = this.db.createStatement(
      "SELECT CASE WHEN date_added >= :firstBucketEndTime THEN :firstBucketEndTime " +
      "            WHEN date_added >= :secondBucketEndTime THEN :secondBucketEndTime " +
      "            ELSE :lastBucketEndTime END as endTime , SUM(visit_count) as visitCount " +
      "FROM moz_up_interests_visits " +
      "WHERE interest_id = (SELECT id FROM moz_up_interests WHERE interest =:interest) " +
      "ORDER by endTime DESC ");
    stmt.params.interest = aInterest;
    stmt.params.firstBucketEndTime = firstBucketEndTime;
    stmt.params.secondBucketEndTime = secondBucketEndTime;
    stmt.params.lastBucketEndTime = lastBucketEndTime;
    while (stmt.executeStep()) {
      buckets.push({ endTime: stmt.row.endTime,
      	             visitCount: stmt.row.visitCount });
    }
    stmt.finalize();
    return buckets;
  }

}

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});
