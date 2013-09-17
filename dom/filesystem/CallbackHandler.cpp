/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "CallbackHandler.h"
#include "Directory.h"
#include "FileUtils.h"
#include "Error.h"

namespace mozilla {
namespace dom {
namespace filesystem {

NS_IMPL_ADDREF(CallbackHandler)
NS_IMPL_RELEASE(CallbackHandler)

CallbackHandler::CallbackHandler(Filesystem* aFilesystem,
                   PromiseResolver* aResovler,
                   ErrorResult& aRv)
  : mFilesystem(aFilesystem),
    mResolver(aResovler),
    mRv(aRv)
{
}

CallbackHandler::~CallbackHandler()
{
}

void
CallbackHandler::ReturnDirectory(const nsAString& aRelpath, const nsAString& aName)
{
  nsRefPtr<Directory> dir = FileUtils::CreateDirectory(mFilesystem, aRelpath, aName);
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

} // namespace filesystem
} // namespace dom
} // namespace mozilla
