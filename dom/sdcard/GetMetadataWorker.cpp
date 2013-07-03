/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GetMetadataWorker.h"
#include "nsIFile.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

GetMetadataWorker::GetMetadataWorker(const nsAString& aRelpath) :
    Worker(aRelpath)
{
  SDCARD_LOG("construct GetMetadataWorker");
}

GetMetadataWorker::~GetMetadataWorker()
{
  SDCARD_LOG("destruct GetMetadataWorker");
}

void
GetMetadataWorker::Work()
{
  SDCARD_LOG("in GetMetadataWorker.Work()!");
  SDCARD_LOG("realPath=%s", NS_ConvertUTF16toUTF8(mRelpath).get());
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  nsresult rv = NS_OK;
  bool isDirectory = false;
  mFile->IsDirectory(&isDirectory);
  if (isDirectory) {
    mSize = 0; // size is always 0 for directory
  } else {
    int64_t size = 0;
    rv = mFile->GetFileSize(&size);
    mSize = static_cast<uint64_t>(size);
    if (NS_FAILED(rv) ) {
      SetError(rv);
      return;
    }
  }
  rv = mFile->GetLastModifiedTime(&mTime);
  if (NS_FAILED(rv) ) {
    SetError(rv);
    return;
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
