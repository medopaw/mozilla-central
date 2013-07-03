/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPEvent.h"
#include "Worker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPEvent::SPEvent(Worker* aWorker,
    Caller* aCaller) :
    SDCardEvent(aWorker),
    mCaller(aCaller)
{
  SDCARD_LOG("construct SPEvent");
  MOZ_ASSERT(NS_IsMainThread(), "Only call on main thread!");

}

SPEvent::~SPEvent()
{
  SDCARD_LOG("destruct SPEvent");
}

void
SPEvent::OnError()
{
  SDCARD_LOG("in SPEvent.OnError()!");
  mCaller->CallErrorCallback(mWorker->mErrorName);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
