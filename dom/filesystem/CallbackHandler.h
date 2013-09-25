/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef mozilla_dom_callbackhandler_h__
#define mozilla_dom_callbackhandler_h__

#include "nsString.h"
#include "Filesystem.h"
#include "mozilla/dom/Promise.h"

namespace mozilla {
namespace dom {
namespace filesystem {

class Filesystem;
class Directory;

/*
 * This class is for callback handling.
 */
class CallbackHandler MOZ_FINAL
{
public:
  NS_IMETHOD_(nsrefcnt) AddRef();
  NS_IMETHOD_(nsrefcnt) Release();

private:
  nsAutoRefCnt mRefCnt;
  NS_DECL_OWNINGTHREAD

public:
  CallbackHandler(Filesystem* aFilesystem, Promise* aResovler, ErrorResult& aRv);
  ~CallbackHandler();

  void ReturnDirectory(const nsAString& aRealPath, const nsAString& aName);

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
    aReject ? mPromise->MaybeReject(cx, val) : mPromise->MaybeResolve(cx, val);
  }

private:
  nsRefPtr<Filesystem> mFilesystem;
  nsRefPtr<Promise> mPromise;
  ErrorResult& mRv;
};

} // namespace filesystem
} // namespace dom
} // namespace mozilla

#endif // mozilla_dom_callbackhandler_h__
