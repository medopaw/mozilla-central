/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim:set ts=2 sw=2 sts=2 et cindent: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "Error.h"
#include "Utils.h"

namespace mozilla {
namespace dom {
namespace sdcard {

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
  SDCARD_LOG("in Error::ErrorNameFromCode()");

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

  nsString codeStr;
  switch (aErrorCode) {
  case NS_ERROR_FILE_INVALID_PATH:
    codeStr.AssignLiteral("NS_ERROR_FILE_INVALID_PATH");
    break;
  case NS_ERROR_FILE_UNRECOGNIZED_PATH:
    codeStr.AssignLiteral("NS_ERROR_FILE_UNRECOGNIZED_PATH");
    break;
  case NS_ERROR_FILE_DESTINATION_NOT_DIR:
    codeStr.AssignLiteral("NS_ERROR_FILE_DESTINATION_NOT_DIR");
    break;
  case NS_ERROR_FILE_ACCESS_DENIED:
    codeStr.AssignLiteral("NS_ERROR_FILE_ACCESS_DENIED");
    break;
  case NS_ERROR_FILE_DIR_NOT_EMPTY:
    codeStr.AssignLiteral("NS_ERROR_FILE_DIR_NOT_EMPTY");
    break;
  case NS_ERROR_FILE_TARGET_DOES_NOT_EXIST:
    codeStr.AssignLiteral("NS_ERROR_FILE_TARGET_DOES_NOT_EXIST");
    break;
  case NS_ERROR_NOT_AVAILABLE:
    codeStr.AssignLiteral("NS_ERROR_NOT_AVAILABLE");
    break;
  case NS_ERROR_FILE_ALREADY_EXISTS:
    codeStr.AssignLiteral("NS_ERROR_FILE_ALREADY_EXISTS");
    break;
  case NS_ERROR_DOM_SECURITY_ERR:
    codeStr.AssignLiteral("NS_ERROR_DOM_SECURITY_ERR");
    break;
  case NS_ERROR_OUT_OF_MEMORY:
    codeStr.AssignLiteral("NS_ERROR_OUT_OF_MEMORY");
    break;
  case NS_ERROR_FILE_NOT_DIRECTORY:
    codeStr.AssignLiteral("NS_ERROR_FILE_NOT_DIRECTORY");
    break;
  case NS_ERROR_UNEXPECTED:
    codeStr.AssignLiteral("NS_ERROR_UNEXPECTED");
    break;
  default:
    SDCARD_LOG("Get ErrorName %s from ErrorCode %ul",
        NS_ConvertUTF16toUTF8(aErrorName).get(), aErrorCode)
    ;
    break;
  }
  SDCARD_LOG("Get ErrorName %s from ErrorCode %s",
      NS_ConvertUTF16toUTF8(aErrorName).get(),
      NS_ConvertUTF16toUTF8(codeStr).get());
}

nsRefPtr<DOMError>
Error::GetDOMError(const nsAString& aErrorName)
{
  SDCARD_LOG("in ErrorHandler::GetDOMError() with error name %s",
      NS_ConvertUTF16toUTF8(aErrorName).get());

  nsRefPtr<DOMError> domError = new DOMError(nullptr, aErrorName);
  return domError;
}

nsRefPtr<DOMError>
Error::GetDOMError(const nsresult& aErrorCode)
{
  SDCARD_LOG("in ErrorHandler::GetDOMError() with error code");
  MOZ_ASSERT(aErrorCode != NS_OK, "NS_OK is not an error.");

  nsRefPtr<DOMError> domError = new DOMError(nullptr, aErrorCode);
  if (!domError) {
    nsString errorName;
    Error::ErrorNameFromCode(errorName, aErrorCode);
    domError = Error::GetDOMError(errorName);
  }
  return domError;
}

} // namespace sdcard
} // namespace dom
} // namespace mozilla
