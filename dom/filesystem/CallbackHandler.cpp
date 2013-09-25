/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CallbackHandler.h"
#include "mozilla/ErrorResult.h"
#include "mozilla/dom/Promise.h"
#include "Directory.h"
#include "FileUtils.h"
#include "Error.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(CallbackHandler)
NS_IMPL_RELEASE(CallbackHandler)

CallbackHandler::CallbackHandler(Filesystem* aFilesystem,
                   Promise* aPromise,
                   ErrorResult& aRv)
  : mFilesystem(do_GetWeakReference(aFilesystem)),
    mPromise(aPromise),
    mRv(aRv)
{
}

CallbackHandler::~CallbackHandler()
{
}

void
CallbackHandler::ReturnDirectory(const nsAString& aRealPath, const nsAString& aName)
{
  nsCOMPtr<Filesystem> filesystem = GetFilesystem();
  if (!filesystem) {
    Fail(Error::DOM_ERROR_INVALID_STATE);
    return;
  }
  nsRefPtr<Directory> dir = FileUtils::CreateDirectory(filesystem, aRealPath, aName);
  if (!dir) {
    Fail(Error::DOM_ERROR_SECURITY);
    return;
  }
  Call(dir.get());
}

void
CallbackHandler::Fail(const nsAString& aError)
{
  nsRefPtr<DOMError> domError = Error::GetDOMError(aError);
  Call(domError.get(), true);
}

already_AddRefed<Filesystem>
CallbackHandler::GetFilesystem()
{
  nsCOMPtr<Filesystem> filesystem = do_QueryReferent(mFilesystem);
  return filesystem.forget();
}

template<class T>
void CallbackHandler::Call(T* obj, bool aReject /*= false*/)
{
  nsCOMPtr<Filesystem> filesystem = GetFilesystem();
  if (!filesystem) {
    mRv.Throw(NS_ERROR_FAILURE);
    return;
  }
  nsCOMPtr<nsIGlobalObject> globalObject = do_QueryInterface(
    filesystem->GetWindow());
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

} // namespace filesystem
} // namespace dom
} // namespace mozilla
