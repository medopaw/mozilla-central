/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsString.h"
// #include "nsCOMPtr.h"
#include "nsAutoPtr.h"
#include "FileUtils.h"
#include "nsIFile.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class Result;

/*
 * This class is to perform actual file operations.
 */
class Worker
{
public:
  Worker(const nsAString& aRealPath, Result* aResult);
  virtual ~Worker();

  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

protected:
  nsAutoRefCnt mRefCnt;
  NS_DECL_OWNINGTHREAD

public:
  bool Init();
  virtual void Work() = 0;

  void SetError(const nsAString& aErrorName);
  void SetError(const nsresult& aErrorCode);

  bool HasError();
  void GetError(nsString& aError);

  Result* GetResult();

protected:
  nsString mErrorName;
  nsRefPtr<Result> mResult;

  nsString mRealPath;
  // Not thread safe. Only access it form worker thread.
  nsCOMPtr<nsIFile> mFile;
  FileInfo mInfo;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
