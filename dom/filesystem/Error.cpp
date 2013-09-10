/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Error.h"

namespace mozilla {
namespace dom {
namespace filesystem {

const nsString Error::DOM_ERROR_ENCODING =
    NS_LITERAL_STRING("EncodingError");
const nsString Error::DOM_ERROR_INVALID_MODIFICATION =
    NS_LITERAL_STRING("InvalidModificationError");
const nsString Error::DOM_ERROR_INVALID_STATE =
    NS_LITERAL_STRING("InvalidStateError");
const nsString Error::DOM_ERROR_NOT_FOUND =
    NS_LITERAL_STRING("NotFoundError");
const nsString Error::DOM_ERROR_NOT_READABLE =
    NS_LITERAL_STRING("NotReadableError");
const nsString Error::DOM_ERROR_NO_MODIFICATION_ALLOWED =
    NS_LITERAL_STRING("NoModificationAllowedError");
const nsString Error::DOM_ERROR_PATH_EXISTS =
    NS_LITERAL_STRING("PathExistsError");
const nsString Error::DOM_ERROR_QUOTA_EXCEEDED =
    NS_LITERAL_STRING("QuotaExceededError");
const nsString Error::DOM_ERROR_SECURITY =
    NS_LITERAL_STRING("SecurityError");
const nsString Error::DOM_ERROR_TYPE_MISMATCH =
    NS_LITERAL_STRING("TypeMismatchError");
const nsString Error::DOM_ERROR_UNKNOWN =
    NS_LITERAL_STRING("Unknown");

void
Error::ErrorNameFromCode(nsAString& aErrorName, const nsresult& aErrorCode)
{
  switch (aErrorCode) {
  case NS_ERROR_FILE_INVALID_PATH:
    case NS_ERROR_FILE_UNRECOGNIZED_PATH:
    aErrorName = DOM_ERROR_ENCODING;
    break;
  case NS_ERROR_FILE_DESTINATION_NOT_DIR:
    aErrorName = DOM_ERROR_INVALID_MODIFICATION;
    break;
  case NS_ERROR_FILE_ACCESS_DENIED:
    case NS_ERROR_FILE_DIR_NOT_EMPTY:
    aErrorName = DOM_ERROR_NO_MODIFICATION_ALLOWED;
    break;
  case NS_ERROR_FILE_TARGET_DOES_NOT_EXIST:
    case NS_ERROR_NOT_AVAILABLE:
    aErrorName = DOM_ERROR_NOT_FOUND;
    break;
  case NS_ERROR_FILE_ALREADY_EXISTS:
    aErrorName = DOM_ERROR_PATH_EXISTS;
    break;
  case NS_ERROR_FILE_NOT_DIRECTORY:
    aErrorName = DOM_ERROR_TYPE_MISMATCH;
    break;
  case NS_ERROR_UNEXPECTED:
    default:
    aErrorName = DOM_ERROR_UNKNOWN;
    break;
  }
}

nsRefPtr<DOMError>
Error::GetDOMError(const nsAString& aErrorName)
{
  nsRefPtr<DOMError> domError = new DOMError(nullptr, aErrorName);
  return domError;
}

nsRefPtr<DOMError>
Error::GetDOMError(const nsresult& aErrorCode)
{
  MOZ_ASSERT(aErrorCode != NS_OK, "NS_OK is not an error.");

  nsRefPtr<DOMError> domError = new DOMError(nullptr, aErrorCode);
  if (!domError) {
    nsString errorName;
    Error::ErrorNameFromCode(errorName, aErrorCode);
    domError = Error::GetDOMError(errorName);
  }
  return domError;
}

} // namespace filesystem
} // namespace dom
} // namespace mozilla
