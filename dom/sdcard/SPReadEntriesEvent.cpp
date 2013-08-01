/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPReadEntriesEvent.h"
#include "ReadEntriesWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPReadEntriesEvent::SPReadEntriesEvent(const nsAString& aRelpath, bool aDeep, Caller* aCaller) :
    SPEvent(new ReadEntriesWorker(aRelpath, aDeep), aCaller)
{
  SDCARD_LOG("construct SPReadEntriesEvent");
}

SPReadEntriesEvent::~SPReadEntriesEvent()
{
  SDCARD_LOG("destruct SPReadEntriesEvent");
}

void
SPReadEntriesEvent::OnSuccess()
{
  SDCARD_LOG("in SPReadEntriesEvent.OnSuccess()!");
  mCaller->CallEntriesCallback(
      static_cast<ReadEntriesWorker*>(mWorker.get())->mResultPaths);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
