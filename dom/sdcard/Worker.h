/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsStringGlue.h"
#include "nsCOMPtr.h"

namespace mozilla {
namespace dom {
namespace sdcard {

/*
 * This class is to perform actual file operations.
 */
class Worker
{
public:
  Worker(const nsAString& aRelpath);
  virtual ~Worker();

  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

  bool Init();
  virtual void Work() = 0;

  void SetError(const nsAString& aErrorName);
  void SetError(const nsresult& aErrorCode);
  nsString mErrorName;

protected:
  nsString mRelpath;
  // Not thread safe. Only access it form worker thread.
  nsCOMPtr<nsIFile> mFile;

private:
  nsAutoRefCnt mRefCnt;
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
