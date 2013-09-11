/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCEvent.h"
#include "Worker.h"
#include "FilesystemRequestParent.h"
#include "mozilla/unused.h"

namespace mozilla {
namespace dom {
namespace filesystem {

IPCEvent::IPCEvent(Worker* aWorker,
    FilesystemRequestParent* aParent) :
    FilesystemEvent(aWorker),
    mParent(aParent)
{
  MOZ_ASSERT(NS_IsMainThread(), "Only call on main thread!");

  mCanceled = !(mParent->SetRunnable(true, this));
}

IPCEvent::~IPCEvent()
{
}

void
IPCEvent::OnError()
{
  ErrorResponse response(mWorker->mErrorName);
  unused << mParent->Send__delete__(mParent, response);
}

void
IPCEvent::HandleResult()
{
  mParent->SetRunnable(false);
  FilesystemEvent::HandleResult();
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
