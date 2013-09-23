/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "FilesystemRequestChild.h"
#include "Filesystem.h"
#include "Directory.h"
#include "CallbackHandler.h"

namespace mozilla {
namespace dom {
namespace filesystem {

FilesystemRequestChild::FilesystemRequestChild()
{
  MOZ_COUNT_CTOR(FilesystemRequestChild);
}

FilesystemRequestChild::FilesystemRequestChild(CallbackHandler* aCallbackHandler)
  : mCallbackHandler(aCallbackHandler)
{
  MOZ_COUNT_CTOR(FilesystemRequestChild);
}

FilesystemRequestChild::~FilesystemRequestChild()
{
  MOZ_COUNT_DTOR(FilesystemRequestChild);
}

bool
FilesystemRequestChild::Recv__delete__(const FilesystemResponseValue& aValue)
{
  switch (aValue.type()) {

    case FilesystemResponseValue::TDirectoryResponse:
    {
      DirectoryResponse r = aValue;
      mCallbackHandler->ReturnDirectory(r.realPath(), r.name());
      break;
    }

    case FilesystemResponseValue::TErrorResponse:
    {
      ErrorResponse r = aValue;
      mCallbackHandler->Fail(r.error());
      break;
    }

    default:
    {
      NS_RUNTIMEABORT("not reached");
      break;
    }
  }

  return true;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
