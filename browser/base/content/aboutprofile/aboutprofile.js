/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

"use strict";

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/Preferences.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");


const interestService = Cc["@mozilla.org/places/interests;1"].getService(Ci.nsISupports).wrappedJSObject;
const prefs = new Preferences("interests.");
const kPrefEnabled = "interests.enabled";

let userProfileWrapper = {
  init: function () {
    userProfileWrapper.refreshPayload();

    let iframe = document.getElementById("remote-dashboard");
    iframe.addEventListener("load", userProfileWrapper.initRemotePage, false);
    let dashboard = this._getReportURI();
    iframe.src = dashboard.spec;
    prefs.observe("uploadEnabled", this.updatePrefState, userProfileWrapper);
  },

  uninit: function () {
    prefs.ignore("uploadEnabled", this.updatePrefState, userProfileWrapper);
  },

  _getReportURI: function () {
    let url = Services.urlFormatter.formatURLPref("interests.about.dashboardUrl");
    return Services.io.newURI(url, null, null);
  },

  onOptIn: function () {
    Services.prefs.setBoolPref(kPrefEnabled, true);
    this.updatePrefState();
  },

  onOptOut: function () {
    Services.prefs.setBoolPref(kPrefEnabled, false);
    this.updatePrefState();
  },

  updatePrefState: function () {
    try {
      let prefs = {
        enabled: Services.prefs.getBoolPref(kPrefEnabled),
      }
      this.injectData("prefs", prefs);
    } catch (e) {
      this.reportFailure(this.ERROR_PREFS_FAILED);
    }
  },

  refreshPayload: function () {
    interestService.getJSONPayload().then(userProfileWrapper.updatePayload,
                                                userProfileWrapper.handlePayloadFailure);
  },

  updatePayload: function (data) {
    userProfileWrapper.injectData("payload", data);
  },

  injectData: function (type, content) {
    let report = this._getReportURI();

    // file URIs can't be used for targetOrigin, so we use "*" for this special case
    // in all other cases, pass in the URL to the report so we properly restrict the message dispatch
    let reportUrl = report.scheme == "file" ? "*" : report.spec;

    let data = {
      type: type,
      content: content
    }

    let iframe = document.getElementById("remote-dashboard");
    iframe.contentWindow.postMessage(data, reportUrl);
  },

  handleRemoteCommand: function (evt) {
    switch (evt.detail.command) {
      case "DisableUP":
        this.onOptOut();
        break;
      case "EnableUP":
        this.onOptIn();
        break;
      case "RequestCurrentPrefs":
        this.updatePrefState();
        break;
      case "RequestCurrentPayload":
        this.refreshPayload();
        break;
      default:
        Cu.reportError("Unexpected remote command received: " + evt.detail.command + ". Ignoring command.");
        break;
    }
  },

  initRemotePage: function () {
    let iframe = document.getElementById("remote-dashboard").contentDocument;
    iframe.addEventListener("RemoteUserProfileCommand",
                            function onCommand(e) {userProfileWrapper.handleRemoteCommand(e);},
                            false);
    userProfileWrapper.updatePrefState();
  },

  // error handling
  ERROR_INIT_FAILED:    1,
  ERROR_PAYLOAD_FAILED: 2,
  ERROR_PREFS_FAILED:   3,

  reportFailure: function (error) {
    let details = {
      errorType: error,
    }
    userProfileWrapper.injectData("error", details);
  },

  handleInitFailure: function () {
    userProfileWrapper.reportFailure(userProfileWrapper.ERROR_INIT_FAILED);
  },

  handlePayloadFailure: function () {
    userProfileWrapper.reportFailure(userProfileWrapper.ERROR_PAYLOAD_FAILED);
  },
}
