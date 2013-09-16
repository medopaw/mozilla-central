/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GetEntryWorker.h"
#include "FileUtils.h"
#include "Error.h"
#include "Result.h"

namespace mozilla {
namespace dom {
namespace filesystem {

GetEntryWorker::GetEntryWorker(const nsAString& aRelpath,
                               Result* aResult)
  : Worker(aRelpath, aResult)
{
}

GetEntryWorker::~GetEntryWorker()
{
}

void
GetEntryWorker::Work()
{
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  if (!mInfo.exists) {
    SetError(Error::DOM_ERROR_NOT_FOUND);
    return;
  }

  if (!mInfo.isDirectory && !mInfo.isFile) {
    SetError(Error::DOM_ERROR_TYPE_MISMATCH);
    return;
  }

  FileInfoResult* result = static_cast<FileInfoResult*>(mResult.get());
  result->mValue = mInfo;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
