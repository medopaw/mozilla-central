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

EntranceEvent::EntranceEvent(Filesystem* aFilesystem, const nsAString& aRelpath,
    Finisher* aFinisher) :
    FilesystemEvent(aFilesystem, CreateWorker(aRelpath), aFinisher)
{
}

EntranceEvent::EntranceEvent(Filesystem* aFilesystem, const nsAString& aRelpath,
    FilesystemRequestParent* aParent) :
    FilesystemEvent(aFilesystem, CreateWorker(aRelpath), aParent)
{
}

EntranceEvent::~EntranceEvent()
{
}

Worker*
EntranceEvent::CreateWorker(const nsAString& aRelpath)
{
  nsRefPtr<Worker> worker = new GetEntryWorker(
      aRelpath, new FileInfoResult(FilesystemResultType::Directory));
  return worker;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
