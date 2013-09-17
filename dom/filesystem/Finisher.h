/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#pragma once

#include "nsString.h"
#include "Filesystem.h"
// #include "mozilla/dom/FilesystemBinding.h"
#include "mozilla/dom/PromiseResolver.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class Filesystem;
class Directory;

/*
 * This class is for callback handling.
 */
class Finisher MOZ_FINAL
{
public:
  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

private:
  nsAutoRefCnt mRefCnt;
  NS_DECL_OWNINGTHREAD

public:
  Finisher(Filesystem* aFilesystem, PromiseResolver* aResovler, ErrorResult& aRv);
  ~Finisher();

  void ReturnDirectory(const nsAString& aRelpath, const nsAString& aName);

  void Fail(const nsAString& aError);

private:
  // For objects whose class have WrapObject()
  template<class T>
  void Call(T* obj, bool aReject = false)
  {
    nsCOMPtr<nsIGlobalObject> globalObject = do_QueryInterface(
        mFilesystem->GetWindow());
    if (!globalObject) {
      mRv.Throw(NS_ERROR_FAILURE);
      return;
    }

    AutoSafeJSContext cx;
    JS::Rooted<JSObject*> global(cx, globalObject->GetGlobalJSObject());

    Optional<JS::Handle<JS::Value> > val(cx,
      OBJECT_TO_JSVAL(obj->WrapObject(cx, global)));
    aReject ? mResolver->Reject(cx, val) : mResolver->Resolve(cx, val);
  }

private:
  nsRefPtr<Filesystem> mFilesystem;
  nsRefPtr<PromiseResolver> mResolver;
  ErrorResult& mRv;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla
