/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "SPCopyAndMoveToEvent.h"
#include "CopyAndMoveToWorker.h"
#include "Caller.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

SPCopyAndMoveToEvent::SPCopyAndMoveToEvent(const nsAString& aRelpath,
    const nsAString& aParentPath,
    const nsAString& aNewName,
    bool aIsCopy,
    bool aUndecided,
    Caller* aCaller) :
    SPEvent(
      new CopyAndMoveToWorker(aRelpath, aParentPath, aNewName, aIsCopy, aUndecided),
      aCaller)
{
  SDCARD_LOG("construct SPCopyAndMoveToEvent");
}

SPCopyAndMoveToEvent::~SPCopyAndMoveToEvent()
{
  SDCARD_LOG("destruct SPCopyAndMoveToEvent");
}

void
SPCopyAndMoveToEvent::OnSuccess()
{
  SDCARD_LOG("in SPCopyAndMoveToEvent.OnSuccess()!");

  mCaller->CallEntryCallback(
      static_cast<CopyAndMoveToWorker*>(mWorker.get())->mResultPath);
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
