/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPGetMetadataEvent.h"
#include "GetMetadataWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPGetMetadataEvent::SPGetMetadataEvent(const nsAString& aRelpath, Caller* aCaller) :
    SPEvent(new GetMetadataWorker(aRelpath), aCaller)
{
  SDCARD_LOG("construct SPGetMetadataEvent");
}

SPGetMetadataEvent::~SPGetMetadataEvent()
{
  SDCARD_LOG("destruct SPGetMetadataEvent");
}

void
SPGetMetadataEvent::OnSuccess()
{
  SDCARD_LOG("in SPGetMetadataEvent.OnSuccess()!");
  GetMetadataWorker* worker = static_cast<GetMetadataWorker*>(mWorker.get());
  mCaller->CallMetadataCallback(worker->mTime, worker->mSize);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
