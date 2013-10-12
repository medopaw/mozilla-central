/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Worker.h"
#include "nsThreadUtils.h"
#include "Error.h"
#include "Result.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(Worker)
NS_IMPL_RELEASE(Worker)

Worker::Worker(FilesystemWorkType aWorkType, const nsAString& aRealPath,
               Result* aResult)
  : mWorkType(aWorkType),
    mResult(aResult),
    mRealPath(aRealPath)
{
}

Worker::~Worker()
{
}

bool
Worker::Init()
{
  // Resolve mFile from mRealPath.
  nsresult rv = NS_NewLocalFile(mRealPath, false, getter_AddRefs(mFile));
  if (NS_FAILED(rv)) {
    SetError(rv);
    return false;
  }
  
  rv = FileUtils::GetFileInfo(mFile, mInfo);
  if (NS_FAILED(rv)) {
    SetError(rv);
    return false;
  }

  return true;
}

void
Worker::Work()
{
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  switch (mWorkType) {

    case FilesystemWorkType::CreateDirectory: {
      break;
    }

    case FilesystemWorkType::GetEntry: {
      GetEntryWork();
      break;
    }

    default: {
      break;
    }

  }
}

void
Worker::GetEntryWork()
{
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

void
Worker::SetError(const nsAString& aErrorName)
{
  mErrorName = aErrorName;
}

void
Worker::SetError(const nsresult& aErrorCode)
{
  if (aErrorCode != NS_OK) {
    Error::ErrorNameFromCode(mErrorName, aErrorCode);
  }
}

bool
Worker::HasError()
{
  return !mErrorName.IsEmpty();
}

void
Worker::GetError(nsString& aError)
{
  aError = mErrorName;
}

Result*
Worker::GetResult()
{
  return mResult;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
