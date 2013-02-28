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

let PlacesInterestsStorage = {
  addInterestForHost: function (aInterest, aHost) {
    Cu.reportError(typeof(aInterest));
    Cu.reportError("aInterest: " + aInterest);
    Cu.reportError("aHost: " + aHost);
    let stmt = this.db.createStatement(
      "INSERT OR IGNORE INTO moz_up_interests (host, interest) " +
      "VALUES((SELECT id FROM moz_hosts WHERE host = :host), :interest)");
    stmt.params.host = aHost;
    stmt.params.interest = aInterest;
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
  	let stmt = this.db.createStatement(
      "SELECT interest, endTime, visitCount " +
      "FROM moz_up_buckets " +
      "WHERE interest = :interest " +
      "ORDER by interest ASC, endTime DESC ");
    stmt.params.interest = aInterest;
    while (stmt.executeStep()) {
      buckets.push({ endTime: stmt.row.endTime,
      	             visitCount: stmt.row.visitCount });
    }
    stmt.finalize();
    return buckets;
  },

  updateBucketsForInterest: function (aInterest) {
  	let stmt = this.db.createStatement(
      "SELECT (endTime >= (strftime('%s','now','localtime','start of day','utc') * 1000000)) AS updateNewest " +
      "FROM moz_up_buckets WHERE interest = :interest " +
      "ORDER BY endTime DESC LIMIT 1");
  	stmt.params.interest = aInterest;
  	stmt.executeStep();
  	let shouldUpdateOnlyNewestBucket = stmt.row.updateNewest;
    stmt.finalize();

    stmt = this.db.createStatement(
      "UPDATE moz_up_buckets " +
      "SET endTime = (strftime('%s','now','localtime','utc') * 1000000), " +
      "visitCount = (SELECT count(*) FROM moz_historyvisits " +
                        "WHERE visit_date BETWEEN (strftime('%s','now','localtime','start of day','-30 days','utc') * 1000000) " +
                                             "AND (strftime('%s','now','localtime','utc') * 1000000)" +
                    "AND place_id IN (SELECT id FROM moz_places " +
                 "WHERE rev_host = get_unreversed_host((SELECT h.host FROM moz_hosts h JOIN moz_up_interests i ON i.host = h.id WHERE i.interest = :interest) || '.') || '.' " +
                    "OR rev_host = get_unreversed_host((SELECT h.host FROM moz_hosts h JOIN moz_up_interests i ON i.host = h.id WHERE i.interest = :interest) || '.') || '.www.' ) " +
                    ") " +
      "WHERE interest = :interest " +
        "AND endTime = (SELECT MAX(endTime) FROM moz_up_buckets WHERE interest = :interest)");
    stmt.params.interest = aInterest;
    stmt.execute();
    stmt.finalize();

    if (shouldUpdateOnlyNewestBucket)
      return;

    stmt = this.db.createStatement(
      "UPDATE moz_up_buckets " +
      "SET endTime = (strftime('%s','now','localtime','start of day','-30 days','utc') * 1000000), " +
      "visitCount = (SELECT count(*) FROM moz_historyvisits " +
                        "WHERE visit_date BETWEEN (strftime('%s','now','localtime','start of day','-60 days','utc') * 1000000) " +
                                             "AND (strftime('%s','now','localtime','start of day','-30 days','utc') * 1000000) " +
      "WHERE interest = :interest " +
        "AND endTime = (SELECT endTime FROM moz_up_buckets WHERE interest = :interest ORDER BY endTime DESC LIMIT 1 OFFSET 1)");
    stmt.params.interest = aInterest;
    stmt.execute();
    stmt.finalize();

    stmt = this.db.createStatement(
      "UPDATE moz_up_buckets " +
      "SET endTime = (strftime('%s','now','localtime','start of day','-60 days','utc') * 1000000), " +
      "visitCount = (SELECT count(*) FROM moz_historyvisits " +
                        "WHERE visit_date < (strftime('%s','now','localtime','start of day','-60 days','utc') * 1000000) " +
      "WHERE interest = :interest " +
        "AND endTime = (SELECT MIN(endTime) FROM moz_up_buckets WHERE interest = :interest");
    stmt.params.interest = aInterest;
    stmt.execute();  
    stmt.finalize();
  }
}

XPCOMUtils.defineLazyGetter(PlacesInterestsStorage, "db", function() {
  return PlacesUtils.history.QueryInterface(Ci.nsPIPlacesDatabase).DBConnection;
});
