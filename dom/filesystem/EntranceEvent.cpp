/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// #include "EntranceEvent.h"
#include "EntranceEvent.h"
#include "FilesystemRequestParent.h"
#include "mozilla/unused.h"
#include "Filesystem.h"
#include "Result.h"
#include "GetEntryWorker.h"

namespace mozilla {
namespace dom {
namespace filesystem {

EntranceEvent::EntranceEvent(const nsAString& aRealPath,
                             CallbackHandler* aCallbackHandler)
  : FilesystemEvent(CreateWorker(aRealPath), aCallbackHandler)
{
}

EntranceEvent::EntranceEvent(const nsAString& aRealPath,
                             FilesystemRequestParent* aParent)
  : FilesystemEvent(CreateWorker(aRealPath), aParent)
{
}

EntranceEvent::~EntranceEvent()
{
}

Worker*
EntranceEvent::CreateWorker(const nsAString& aRealPath)
{
  return new GetEntryWorker(aRealPath,
                            new FileInfoResult(FilesystemResultType::Directory));
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
