/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCRemoveEvent.h"
#include "RemoveWorker.h"
#include "SDCardRequestParent.h"
#include "mozilla/unused.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

IPCRemoveEvent::IPCRemoveEvent(const nsAString& aRelpath,
    bool aRecursive,
    SDCardRequestParent* aParent) :
    IPCEvent(new RemoveWorker(aRelpath, aRecursive), aParent)
{
  SDCARD_LOG("construct IPCRemoveEvent");
}

IPCRemoveEvent::~IPCRemoveEvent()
{
  SDCARD_LOG("destruct IPCRemoveEvent");
}

void IPCRemoveEvent::OnSuccess()
{
  SDCARD_LOG("in IPCRemoveEvent.OnSuccess()!");

  VoidResponse response;
  unused << mParent->Send__delete__(mParent, response);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
