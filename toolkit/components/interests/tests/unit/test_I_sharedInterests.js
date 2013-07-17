/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PlacesInterestsStorage.jsm");

function run_test() {
  run_next_test();
}

add_task(function test_I_sharedInterestsSetting()
{
  yield promiseAddVisitsWithRefresh(["http://www.cars.com/",
                                     "http://www.mozilla.org/",
                                     "http://www.netflix.com/",
                                     "http://www.samsung.com/"]);
  yield addInterest("cars");
  yield addInterest("computers");
  yield addInterest("movies");
  yield addInterest("technology");
  yield addInterest("video-games");
  yield addInterest("history");

  yield PlacesInterestsStorage.addInterestHost("technology", "samsung.com");
  yield PlacesInterestsStorage.addInterestHost("cars", "cars.com");
  yield PlacesInterestsStorage.addInterestHost("movies", "netflix.com");
  yield PlacesInterestsStorage.addInterestHost("computers", "mozilla.org");

  // make a bunch of insertions for a number of days
  let now = Date.now();
  let today = PlacesInterestsStorage._convertDateToDays(now);

  // add visit
  yield PlacesInterestsStorage.addInterestVisit("technology", {visitTime: (now - MS_PER_DAY*0), visitCount: 1});
  yield PlacesInterestsStorage.addInterestVisit("cars", {visitTime: (now - MS_PER_DAY*1), visitCount: 3});
  yield PlacesInterestsStorage.addInterestVisit("movies", {visitTime: (now - MS_PER_DAY*2), visitCount: 3});

  // get top 2 visits, test result limiting
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    interestLimit: 2,
  });

  isIdentical(results,[
                        {"name":"cars",
                         "score":2.896551724137931,
                         "diversity":25,
                         "recency":{"immediate":3,"recent":0,"past":0}
                        },
                        {"name":"movies",
                         "score":2.793103448275862,
                         "diversity":25,
                         "recency":{"immediate":3,"recent":0,"past":0}
                        }
                      ]);

  // no shared interests should be found
  yield PlacesInterestsStorage.getDomainsForSharedInterests(["cars","movies"]).then(results => {
    do_check_eq(results.length,0);
  });

  // try out with requestingHost 
  results = yield iServiceObject.getInterestsByNamespace("", {
    checkSharable: true,
    excludeMeta: true,
    interestLimit: 2,
    requestingHost: "foo.com",
  });

  isIdentical(results,[
                        {"name":"cars",
                         "score":2.896551724137931,
                         "diversity":25,
                         "recency":{"immediate":3,"recent":0,"past":0}
                        },
                        {"name":"movies",
                         "score":2.793103448275862,
                         "diversity":25,
                         "recency":{"immediate":3,"recent":0,"past":0}
                        }
                      ]);


  // do it with another host
  results = yield iServiceObject.getInterestsByNames(["cars","movies","technology"], {
    checkSharable: true,
    excludeMeta: true,
    requestingHost: "bar.com",
  });

  yield PlacesInterestsStorage.getPersonalizedDomains().then(results => {
    //dump( JSON.stringify(results)  + " <<<<\n");
    isIdentical(results,[
                          {"interest":"cars","domain":"bar.com","day":today},
                          {"interest":"movies","domain":"bar.com","day":today},
                          {"interest":"technology","domain":"bar.com","day":today},
                          {"interest":"cars","domain":"foo.com","day":today},
                          {"interest":"movies","domain":"foo.com","day":today},
                        ]);
  });
});

