/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "Worker.h"

namespace mozilla {
namespace dom {
namespace sdcard {

/*
 * This class is to perform actual file operations.
 */
class CopyAndMoveToWorker : public Worker
{
public:
  CopyAndMoveToWorker(const nsAString& aRelpath,
      const nsAString& aParentPath,
      const nsAString& aNewName,
      bool aIsCopy,
      bool aUndecided);
  ~CopyAndMoveToWorker();

  nsString mResultPath;

private:
  virtual void Work() MOZ_OVERRIDE;

  nsString mParentPath;
  nsString mNewName;
  bool mIsCopy;
  bool mUndecided;
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
