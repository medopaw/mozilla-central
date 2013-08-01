/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPEnumerateEvent.h"
#include "EnumerateWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPEnumerateEvent::SPEnumerateEvent(const nsAString& aRelpath, bool aDeep, Caller* aCaller) :
    SPEvent(new EnumerateWorker(aRelpath, aDeep), aCaller)
{
  SDCARD_LOG("construct SPEnumerateEvent");
}

SPEnumerateEvent::~SPEnumerateEvent()
{
  SDCARD_LOG("destruct SPEnumerateEvent");
}

void
SPEnumerateEvent::OnSuccess()
{
  SDCARD_LOG("in SPEnumerateEvent.OnSuccess()!");
  mCaller->CallEntriesCallback(
      static_cast<EnumerateWorker*>(mWorker.get())->mResultPaths);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
