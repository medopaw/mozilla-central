/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCCopyAndMoveToEvent.h"
#include "CopyAndMoveToWorker.h"
#include "SDCardRequestParent.h"
#include "mozilla/unused.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

IPCCopyAndMoveToEvent::IPCCopyAndMoveToEvent(const nsAString& aRelpath,
    const nsAString& aParentPath,
    const nsAString& aNewName,
    bool aIsCopy,
    SDCardRequestParent* aParent) :
    IPCEvent(
      new CopyAndMoveToWorker(aRelpath, aParentPath, aNewName, aIsCopy),
      aParent)
{
  SDCARD_LOG("construct IPCCopyAndMoveToEvent");
}

IPCCopyAndMoveToEvent::~IPCCopyAndMoveToEvent()
{
  SDCARD_LOG("destruct IPCCopyAndMoveToEvent");
}

void
IPCCopyAndMoveToEvent::OnSuccess()
{
  SDCARD_LOG("in IPCCopyAndMoveToEvent.OnSuccess()!");

  PathResponse response(
      static_cast<CopyAndMoveToWorker*>(mWorker.get())->mResultPath);
  unused << mParent->Send__delete__(mParent, response);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
