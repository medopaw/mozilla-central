/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsStringGlue.h"
#include "FileSystem.h"
#include "mozilla/dom/FileSystemBinding.h"

namespace mozilla {
namespace dom {
namespace sdcard {

/*
 * This class is for callback handling.
 */
class Caller
{
public:
  Caller(CallbackFunction* aSuccessCallback, ErrorCallback* aErrorCallback);
  Caller(CallbackFunction& aSuccessCallback,
      const Optional<OwningNonNull<ErrorCallback> >& aErrorCallback);

  template <class T>
  Caller(const Optional<OwningNonNull<T> >& aSuccessCallback,
      const Optional<OwningNonNull<ErrorCallback> >& aErrorCallback) :
      mSuccessCallback(nullptr),
      mErrorCallback(nullptr)
  {
    // SDCARD_LOG("construct Caller");

    if (aSuccessCallback.WasPassed()) {
      mSuccessCallback = &(aSuccessCallback.Value());
    }
    if (aErrorCallback.WasPassed()) {
      mErrorCallback = &(aErrorCallback.Value());
    }
  }

  virtual ~Caller();

  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

  void CallErrorCallback(const nsAString& error);
  void CallEntryCallback(const nsAString& path);
  void CallEntriesCallback(const InfallibleTArray<nsString>& paths);
  void CallMetadataCallback(int64_t modificationTime, uint64_t size);
  void CallVoidCallback();

private:
  nsAutoRefCnt mRefCnt;

  nsRefPtr<CallbackFunction> mSuccessCallback;
  nsRefPtr<ErrorCallback> mErrorCallback;
};

} // namespace sdcard
} // namespace dom
} // namespace mozilla
