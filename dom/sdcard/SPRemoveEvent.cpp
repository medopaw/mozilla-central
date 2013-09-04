/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPRemoveEvent.h"
#include "RemoveWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPRemoveEvent::SPRemoveEvent(const nsAString& aRelpath,
    bool aRecursive,
    Caller* aCaller) :
    SPEvent(
        new RemoveWorker(aRelpath, aRecursive),
        aCaller)
{
  SDCARD_LOG("construct SPRemoveEvent");
}

SPRemoveEvent::~SPRemoveEvent()
{
  SDCARD_LOG("destruct SPRemoveEvent");
}

void
SPRemoveEvent::OnSuccess()
{
  SDCARD_LOG("in SPRemoveEvent.OnSuccess()!");
  mCaller->Success(true);
  // mCaller->CallVoidCallback();
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
