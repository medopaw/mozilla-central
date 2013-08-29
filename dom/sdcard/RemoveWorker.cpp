/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "RemoveWorker.h"
#include "nsIFile.h"
#include "Path.h"
#include "Error.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

RemoveWorker::RemoveWorker(const nsAString& aRelpath, bool aDeep) :
    Worker(aRelpath),
    mDeep(aDeep)
{
  SDCARD_LOG("construct RemoveWorker");
}

RemoveWorker::~RemoveWorker()
{
  SDCARD_LOG("destruct RemoveWorker");
}

void
RemoveWorker::Work()
{
  SDCARD_LOG("in RemoveWorker.Work() with mRelpath=%s and mDeep=%d",
      NS_ConvertUTF16toUTF8(mRelpath).get(), mDeep);
  MOZ_ASSERT(!NS_IsMainThread(), "Never call on main thread!");

  nsresult rv = NS_OK;
  if (Path::IsBase(mRelpath)) {
    // Cannot remove root directory
    SetError(Error::DOM_ERROR_NO_MODIFICATION_ALLOWED);
  } else {
    rv = mFile->Remove(mDeep);
    if (NS_FAILED(rv) ) {
      SDCARD_LOG("Error occurs when removing entry.");
      SetError(rv);
    }
  }
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
