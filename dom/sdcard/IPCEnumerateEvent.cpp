/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCEnumerateEvent.h"
#include "EnumerateWorker.h"
#include "SDCardRequestParent.h"
#include "mozilla/unused.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

IPCEnumerateEvent::IPCEnumerateEvent(const nsAString& aRelpath,
    bool aDeep,
    SDCardRequestParent* aParent) :
    IPCEvent(new EnumerateWorker(aRelpath, aDeep), aParent)
{
  SDCARD_LOG("construct IPCEnumerateEvent");
}

IPCEnumerateEvent::~IPCEnumerateEvent()
{
  SDCARD_LOG("destruct IPCEnumerateEvent");
}

void IPCEnumerateEvent::OnSuccess()
{
  SDCARD_LOG("in IPCEnumerateEvent.OnSuccess()!");

  PathsResponse response(
      static_cast<EnumerateWorker*>(mWorker.get())->mResultPaths);
  unused << mParent->Send__delete__(mParent, response);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
