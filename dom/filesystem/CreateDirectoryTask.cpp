/*
 * CreateDirectoryTask.cpp
 *
 *  Created on: Sep 30, 2013
 *      Author: yuan
 */

#include "CreateDirectoryTask.h"
#include "nsString.h"

namespace mozilla {

namespace dom {

namespace filesystem {

CreateDirectoryTask::CreateDirectoryTask(
  Directory* aDir, const nsAString& aPath)
{
}

CreateDirectoryTask::CreateDirectoryTask(
  const FilesystemCreateDirectoryParams& aParam,
  FilesystemRequestParent* aParent)
  : TaskBase(aParent)
{

}

CreateDirectoryTask::~CreateDirectoryTask()
{
  // TODO Auto-generated destructor stub
}

}

}

}
