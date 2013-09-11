/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "IPCGetEntryEvent.h"
#include "GetEntryWorker.h"
#include "FilesystemRequestParent.h"
#include "mozilla/unused.h"

namespace mozilla {
namespace dom {
namespace filesystem {

IPCGetEntryEvent::IPCGetEntryEvent(const nsAString& aRelpath,
    FilesystemRequestParent* aParent) :
    IPCEvent(new GetEntryWorker(aRelpath), aParent)
{
}

IPCGetEntryEvent::~IPCGetEntryEvent()
{
}

void
IPCGetEntryEvent::OnSuccess()
{
  GetEntryWorker* w = static_cast<GetEntryWorker*>(mWorker.get());
  DirectoryResponse response(w->mResultPath, w->mResultName);
  unused << mParent->Send__delete__(mParent, response);
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
