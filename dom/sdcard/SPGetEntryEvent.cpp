/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPGetEntryEvent.h"
#include "GetEntryWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPGetEntryEvent::SPGetEntryEvent(const nsAString& aRelpath,
    bool aCreate,
    bool aExclusive,
    bool aIsFile,
    Caller* aCaller) :
    SPEvent(new GetEntryWorker(aRelpath, aCreate, aExclusive, aIsFile), aCaller)
{
  SDCARD_LOG("construct SPGetEntryEvent");
}

SPGetEntryEvent::~SPGetEntryEvent()
{
  SDCARD_LOG("destruct SPGetEntryEvent");
}

void
SPGetEntryEvent::OnSuccess()
{
  SDCARD_LOG("in SPGetEntryEvent.OnSuccess()!");
  mCaller->CallEntryCallback(
      static_cast<GetEntryWorker*>(mWorker.get())->mResultPath);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
