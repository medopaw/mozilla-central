/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCEvent.h"
#include "Worker.h"
#include "SDCardRequestParent.h"
#include "mozilla/unused.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

IPCEvent::IPCEvent(Worker* aWorker,
    SDCardRequestParent* aParent) :
    SDCardEvent(aWorker),
    mParent(aParent)
{
  SDCARD_LOG("construct IPCEvent");
  MOZ_ASSERT(NS_IsMainThread(), "Only call on main thread!");

  mCanceled = !(mParent->SetRunnable(true, this));
}

IPCEvent::~IPCEvent()
{
  SDCARD_LOG("destruct IPCEvent");
}

void
IPCEvent::OnError()
{
  SDCARD_LOG("in IPCEvent.OnError()!");

  ErrorResponse response(mWorker->mErrorName);
  unused << mParent->Send__delete__(mParent, response);
}

void
IPCEvent::HandleResult()
{
  SDCARD_LOG("in IPCEvent.HandleResult");

  mParent->SetRunnable(false);
  SDCardEvent::HandleResult();
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
