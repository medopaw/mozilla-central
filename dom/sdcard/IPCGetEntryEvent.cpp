/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCGetEntryEvent.h"
#include "GetEntryWorker.h"
#include "SDCardRequestParent.h"
#include "mozilla/unused.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

IPCGetEntryEvent::IPCGetEntryEvent(const nsAString& aRelpath,
    bool aCreate,
    bool aExclusive,
    bool aIsFile,
    SDCardRequestParent* aParent) :
    IPCEvent(
        new GetEntryWorker(aRelpath, aCreate, aExclusive, aIsFile),
        aParent)
{
  SDCARD_LOG("construct IPCGetEntryEvent");
}

IPCGetEntryEvent::~IPCGetEntryEvent()
{
  SDCARD_LOG("destruct IPCGetEntryEvent");
}

void
IPCGetEntryEvent::OnSuccess()
{
  SDCARD_LOG("in IPCGetEntryEvent.OnSuccess()!");

  PathResponse response(
      static_cast<GetEntryWorker*>(mWorker.get())->mResultPath);
  unused << mParent->Send__delete__(mParent, response);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
