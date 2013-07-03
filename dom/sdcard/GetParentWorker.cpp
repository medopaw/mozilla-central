/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "GetParentWorker.h"
#include "nsIFile.h"
#include "Path.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

GetParentWorker::GetParentWorker(const nsAString& aRelpath) :
    Worker(aRelpath)
{
  SDCARD_LOG("construct GetParentWorker");
}

GetParentWorker::~GetParentWorker()
{
  SDCARD_LOG("destruct GetParentWorker");
}

void
GetParentWorker::Work()
{
  SDCARD_LOG("in GetParentWorker.Work()!");
  SDCARD_LOG("realPath=%s", NS_ConvertUTF16toUTF8(mRelpath).get());
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  if (Path::IsBase(mRelpath)) {
    // The parent folder of the root is itself.
    mResultPath = mRelpath;
  } else {
    nsCOMPtr<nsIFile> parentFile;
    nsresult rv = mFile->GetParent(getter_AddRefs(parentFile));
    if (NS_FAILED(rv) ) {
      SetError(rv);
    } else {
      rv = parentFile->GetPath(mResultPath);
      if (NS_FAILED(rv) ) {
        SetError(rv);
      }
    }
  }

}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
