/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPGetParentEvent.h"
#include "GetParentWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPGetParentEvent::SPGetParentEvent(const nsAString& aRelpath, Caller* aCaller) :
    SPEvent(new GetParentWorker(aRelpath), aCaller)
{
  SDCARD_LOG("construct SPGetParentEvent");
}

SPGetParentEvent::~SPGetParentEvent()
{
  SDCARD_LOG("destruct SPGetParentEvent");
}

void
SPGetParentEvent::OnSuccess()
{
  SDCARD_LOG("in SPGetParentEvent.OnSuccess()!");
  GetParentWorker* worker = static_cast<GetParentWorker*>(mWorker.get());
  mCaller->CallEntryCallback(worker->mResultPath);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
